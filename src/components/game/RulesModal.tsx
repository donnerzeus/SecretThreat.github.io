import React, { useState } from 'react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { X, Globe } from 'lucide-react';

interface RulesModalProps {
    isOpen: boolean;
    onClose: () => void;
}

type Language = 'en' | 'tr';

export const RulesModal: React.FC<RulesModalProps> = ({ isOpen, onClose }) => {
    const [lang, setLang] = useState<Language>('en');

    if (!isOpen) return null;

    const content = {
        en: {
            title: "How to Play",
            roles: {
                title: "Roles",
                guardian: "Guardians (Liberals): Majority team. Don't know anyone. Goal: Pass 5 Guardian policies or kill the Secret Threat.",
                shadow: "Shadows (Fascists): Minority team. Know each other and the Threat. Goal: Pass 6 Shadow policies or elect the Secret Threat as Chancellor after 3 Shadow policies.",
                threat: "Secret Threat (Hitler): Doesn't know the Shadows (in 7+ players). Goal: Get elected Chancellor later in the game or pass 6 Shadow policies."
            },
            flow: {
                title: "Game Flow",
                step1: "1. Nomination: The President chooses a Chancellor candidate.",
                step2: "2. Voting: All players vote Ja! (Yes) or Nein! (No). If it fails, the tracker advances.",
                step3: "3. Legislation: President draws 3 policies, discards 1. Chancellor receives 2, discards 1. The last one is enacted.",
                step4: "4. Executive Action: If a Shadow policy is enacted, the President might get a power (Investigate, Peek, Execution, etc.)."
            },
            chaos: "Chaos: If 3 elections fail in a row, the top policy is enacted automatically."
        },
        tr: {
            title: "Nasıl Oynanır",
            roles: {
                title: "Roller",
                guardian: "Koruyucular (Liberaller): Çoğunluktur. Kimseyi tanımazlar. Amaç: 5 Koruyucu politikası geçirmek veya Gizli Tehdit'i öldürmek.",
                shadow: "Gölgeler (Faşistler): Azınlıktır. Birbirlerini ve Tehdit'i tanırlar. Amaç: 6 Gölge politikası geçirmek veya 3 politikadan sonra Tehdit'i Şansölye seçtirmek.",
                threat: "Gizli Tehdit (Hitler): Gölgeleri tanımaz (7+ oyuncuda). Amaç: Oyunun ilerleyen safhalarında Şansölye seçilmek veya 6 Gölge politikası geçirmek."
            },
            flow: {
                title: "Oyun Akışı",
                step1: "1. Adaylık: Başkan bir Şansölye adayı seçer.",
                step2: "2. Oylama: Herkes Ja! (Evet) veya Nein! (Hayır) oyu verir. Reddedilirse sayaç ilerler.",
                step3: "3. Yasama: Başkan 3 kart çeker, 1'ini atar. Şansölye 2 kart alır, 1'ini atar. Kalan kart yasalaşır.",
                step4: "4. Başkanlık Gücü: Eğer Gölge politikası yasalaşırsa, Başkan bir güç kazanabilir (Soruşturma, Gözetleme, İnfaz vb.)."
            },
            chaos: "Kaos: Eğer 3 oylama üst üste reddedilirse, destenin en üstündeki kart otomatik yasalaşır."
        }
    };

    const t = content[lang];

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
            <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto relative border-slate-600">
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 text-slate-400 hover:text-white"
                >
                    <X className="w-6 h-6" />
                </button>

                <div className="flex items-center justify-between mb-6 pr-8">
                    <h2 className="text-2xl font-bold text-white">{t.title}</h2>
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setLang(lang === 'en' ? 'tr' : 'en')}
                        className="flex items-center gap-2 text-blue-400 border border-blue-900/50"
                    >
                        <Globe className="w-4 h-4" />
                        {lang === 'en' ? 'Türkçe' : 'English'}
                    </Button>
                </div>

                <div className="space-y-6 text-slate-300">
                    <section>
                        <h3 className="text-lg font-bold text-yellow-500 mb-2">{t.roles.title}</h3>
                        <ul className="space-y-2 list-disc pl-5">
                            <li><span className="text-blue-400 font-bold">Guardian:</span> {t.roles.guardian}</li>
                            <li><span className="text-red-400 font-bold">Shadow:</span> {t.roles.shadow}</li>
                            <li><span className="text-red-500 font-bold">Secret Threat:</span> {t.roles.threat}</li>
                        </ul>
                    </section>

                    <section>
                        <h3 className="text-lg font-bold text-yellow-500 mb-2">{t.flow.title}</h3>
                        <div className="space-y-2">
                            <p>{t.flow.step1}</p>
                            <p>{t.flow.step2}</p>
                            <p>{t.flow.step3}</p>
                            <p>{t.flow.step4}</p>
                        </div>
                    </section>

                    <section className="bg-slate-800/50 p-4 rounded-lg border border-slate-700">
                        <p className="text-sm italic text-slate-400">{t.chaos}</p>
                    </section>
                </div>
            </Card>
        </div>
    );
};
