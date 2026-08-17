import { createContext, useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { API_URL } from '../config';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();

    useEffect(() => {
        const storedUser = localStorage.getItem('user');
        const token = localStorage.getItem('token');
        if (storedUser && token) {
            setUser(JSON.parse(storedUser));
            axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
        }
        setLoading(false);
    }, []);

    const login = async (email, password) => {
        const res = await axios.post(`${API_URL}/api/auth/login`, { email, password });
        localStorage.setItem('token', res.data.token);
        localStorage.setItem('user', JSON.stringify(res.data.user));
        setUser(res.data.user);
        axios.defaults.headers.common['Authorization'] = `Bearer ${res.data.token}`;
        
        if(res.data.user.role === 'admin') navigate('/admin');
        else if(res.data.user.role === 'engineer') navigate('/engineer');
        else navigate('/customer');
    };

    const googleLogin = async (credentialResponse, extraDetails = {}) => {
        const res = await axios.post(`${API_URL}/api/auth/google`, { 
            credential: credentialResponse.credential,
            ...extraDetails
        });

        if (res.data.isNewUser) {
            return res.data;
        }

        localStorage.setItem('token', res.data.token);
        localStorage.setItem('user', JSON.stringify(res.data.user));
        setUser(res.data.user);
        axios.defaults.headers.common['Authorization'] = `Bearer ${res.data.token}`;
        
        if(res.data.user.role === 'admin') navigate('/admin');
        else if(res.data.user.role === 'engineer') navigate('/engineer');
        else navigate('/customer');
        return res.data;
    };

    const logout = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        setUser(null);
        delete axios.defaults.headers.common['Authorization'];
        navigate('/login');
    };

    const updateUserPhoto = (photoUrl) => {
        const updatedUser = { ...user, profile_photo: photoUrl };
        setUser(updatedUser);
        localStorage.setItem('user', JSON.stringify(updatedUser));
    };

    return (
        <AuthContext.Provider value={{ user, login, googleLogin, logout, loading, updateUserPhoto }}>
            {children}
        </AuthContext.Provider>
    );
};
