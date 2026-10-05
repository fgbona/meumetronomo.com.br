Vhosts nginx do CWP para servir `public/` direto (mesmo modelo de lucas.utechs.com.br).
Só o bloco `server` do domínio principal muda; webmail/mail/cpanel seguem iguais ao gerado pelo CWP.

Aplicar no servidor (como root):

```
cp -a /etc/nginx/conf.d/vhosts/meumetronomo.com.br{,.ssl}.conf /root/
cp nginx/meumetronomo.com.br.conf nginx/meumetronomo.com.br.ssl.conf /etc/nginx/conf.d/vhosts/
nginx -t && systemctl reload nginx
```

Atenção: se o CWP regenerar os vhosts do domínio (botão "Rebuild" ou troca de template), reaplicar.
