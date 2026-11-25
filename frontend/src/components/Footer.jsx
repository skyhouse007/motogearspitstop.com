import React from 'react';
import { Link } from 'react-router-dom';
import { Facebook, Instagram, Youtube } from 'lucide-react';
import { getWhatsAppUrl, FACEBOOK_URL, INSTAGRAM_URL, YOUTUBE_URL } from '@/config/contact';
import {
  BUSINESS_ADDRESS_LINES,
  BUSINESS_HOURS_TEXT,
  BUSINESS_PHONE_DISPLAY,
  BUSINESS_PHONE_E164,
  STORE_LOCATION_PATH,
} from '@/config/business';

const footerUnderlineLink =
  'font-montserrat text-sm text-white underline underline-offset-2 transition-colors hover:text-[#c5e840]';

const Footer = () => {
  return (
    <footer className="font-montserrat-bold bg-[#0a0a0a] border-t border-white/10 pt-16 pb-8 text-white">
      <div className="max-w-[1400px] mx-auto px-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 items-start gap-12 mb-12">
          {/* Quick Links */}
          <div>
            <h4 className="text-lg mb-6 tracking-wider text-white">QUICK LINKS</h4>
            <ul className="space-y-3">
              {[
                { label: 'Shop', to: '/products' },
                { label: 'About Us', to: '/about' },
                { label: 'Contact', to: '/contact' },
                { label: 'Whitefield Store', to: STORE_LOCATION_PATH },
              ].map(({ label, to }) => (
                <li key={to}>
                  <Link to={to} className="text-white hover:text-[#e63946] text-sm transition-colors flex items-center gap-2 group">
                    <span className="w-0 group-hover:w-2 h-[1px] bg-[#e63946] transition-all" />
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Location */}
          <div>
            <h4 className="text-lg mb-6 tracking-wider text-white">LOCATION</h4>
            <p className="font-montserrat mb-6 text-sm leading-relaxed text-white/90">
              {BUSINESS_ADDRESS_LINES.map((line) => (
                <span key={line} className="block">
                  {line}
                </span>
              ))}
              <a
                href={getWhatsAppUrl()}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-1 block text-white/90 transition-colors hover:text-[#e63946]"
              >
                {BUSINESS_PHONE_DISPLAY}
              </a>
            </p>
            <div className="flex gap-4">
              <a
                href={INSTAGRAM_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="border border-white/20 bg-white/5 p-2 rounded-sm text-white hover:bg-[#e63946] hover:text-white hover:border-[#e63946] transition-all"
                aria-label="Instagram"
              >
                <Instagram size={20} />
              </a>
              {FACEBOOK_URL ? (
                <a
                  href={FACEBOOK_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="border border-white/20 bg-white/5 p-2 rounded-sm text-white hover:bg-[#e63946] hover:text-white hover:border-[#e63946] transition-all"
                  aria-label="Facebook"
                >
                  <Facebook size={20} />
                </a>
              ) : (
                <span
                  className="border border-white/20 bg-white/5 p-2 rounded-sm text-white/70"
                  title="Add VITE_FACEBOOK_URL to link this icon"
                >
                  <Facebook size={20} aria-hidden />
                </span>
              )}
              {YOUTUBE_URL ? (
                <a
                  href={YOUTUBE_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="border border-white/20 bg-white/5 p-2 rounded-sm text-white hover:bg-[#e63946] hover:text-white hover:border-[#e63946] transition-all"
                  aria-label="YouTube"
                >
                  <Youtube size={20} />
                </a>
              ) : (
                <span
                  className="border border-white/20 bg-white/5 p-2 rounded-sm text-white/70"
                  title="Add VITE_YOUTUBE_URL to link this icon"
                >
                  <Youtube size={20} aria-hidden />
                </span>
              )}
            </div>
          </div>

          {/* Contact Us */}
          <div>
            <h4 className="text-lg mb-6 tracking-wider text-white">CONTACT US</h4>
            <div className="font-montserrat space-y-4 text-sm text-white">
              <a href={`tel:${BUSINESS_PHONE_E164}`} className="block hover:text-[#c5e840] transition-colors">
                {BUSINESS_PHONE_DISPLAY}
              </a>
              <p className="leading-relaxed">
                {BUSINESS_HOURS_TEXT.weekday}
                <span className="block">{BUSINESS_HOURS_TEXT.sunday}</span>
              </p>
              <p className="leading-relaxed text-white/90">
                For any queries please contact{' '}
                <Link to="/contact" className={footerUnderlineLink}>
                  Customer Support
                </Link>
              </p>
            </div>
          </div>

          {/* Careers */}
          <div>
            <h4 className="text-lg mb-6 tracking-wider text-white">CAREERS</h4>
            <div className="font-montserrat space-y-3 text-sm">
              <Link to="/contact" className={`${footerUnderlineLink} block w-fit`}>
                Join
              </Link>
              <a
                href={INSTAGRAM_URL}
                target="_blank"
                rel="noopener noreferrer"
                className={`${footerUnderlineLink} block w-fit`}
              >
                #MotoGearsPitstop
              </a>
            </div>
          </div>
        </div>

        <div className="border-t border-white/10 pt-8">
          <p className="text-white/60 text-xs text-center md:text-left">
            © 2026 MotoGearsPitstop. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
