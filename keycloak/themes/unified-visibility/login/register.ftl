<#import "template.ftl" as layout>
<@layout.registrationLayout displayMessage=!messagesPerField.existsError('firstName','lastName','email','username','password','password-confirm'); section>
    <#if section = "header">
        <div class="brand-header">
            <div class="brand-logo">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                </svg>
            </div>
            <h1 class="brand-title">Create Account</h1>
            <p class="brand-subtitle">Join the platform and start monitoring</p>
        </div>
    <#elseif section = "form">
        <form id="kc-register-form" action="${url.registrationAction}" method="post">
            <div class="form-group">
                <label for="firstName" class="form-label">${msg("firstName")}</label>
                <input type="text" id="firstName" class="form-input" name="firstName"
                       value="${(register.formData.firstName!'')}"
                       placeholder="Enter your first name"
                />
            </div>

            <div class="form-group">
                <label for="lastName" class="form-label">${msg("lastName")}</label>
                <input type="text" id="lastName" class="form-input" name="lastName"
                       value="${(register.formData.lastName!'')}"
                       placeholder="Enter your last name"
                />
            </div>

            <div class="form-group">
                <label for="email" class="form-label">${msg("email")}</label>
                <input type="text" id="email" class="form-input" name="email"
                       value="${(register.formData.email!'')}" autocomplete="email"
                       placeholder="Enter your email"
                />
            </div>

            <#if !realm.registrationEmailAsUsername>
                <div class="form-group">
                    <label for="username" class="form-label">${msg("username")}</label>
                    <input type="text" id="username" class="form-input" name="username"
                           value="${(register.formData.username!'')}" autocomplete="username"
                           placeholder="Choose a username"
                    />
                </div>
            </#if>

            <#if passwordRequired??>
                <div class="form-group">
                    <label for="password" class="form-label">${msg("password")}</label>
                    <div class="password-wrapper">
                        <input type="password" id="password" class="form-input" name="password"
                               autocomplete="new-password"
                               placeholder="Create a password"
                        />
                        <button type="button" class="password-toggle" onclick="togglePassword('password')" aria-label="Toggle password visibility">
                            <svg id="password-eye-open" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                                <circle cx="12" cy="12" r="3"></circle>
                            </svg>
                            <svg id="password-eye-closed" style="display:none" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path>
                                <line x1="1" y1="1" x2="23" y2="23"></line>
                            </svg>
                        </button>
                    </div>
                </div>

                <div class="form-group">
                    <label for="password-confirm" class="form-label">${msg("passwordConfirm")}</label>
                    <div class="password-wrapper">
                        <input type="password" id="password-confirm" class="form-input"
                               name="password-confirm"
                               placeholder="Confirm your password"
                        />
                        <button type="button" class="password-toggle" onclick="togglePassword('password-confirm')" aria-label="Toggle password visibility">
                            <svg id="password-confirm-eye-open" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                                <circle cx="12" cy="12" r="3"></circle>
                            </svg>
                            <svg id="password-confirm-eye-closed" style="display:none" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path>
                                <line x1="1" y1="1" x2="23" y2="23"></line>
                            </svg>
                        </button>
                    </div>
                </div>
            </#if>

            <div class="form-group">
                <input class="submit-btn" type="submit" value="Create Account"/>
            </div>
        </form>
        
        <div class="register-link">
            <span>Already have an account?</span>
            <a href="${url.loginUrl}">Sign in</a>
        </div>
        
        <script>
            function togglePassword(inputId) {
                var input = document.getElementById(inputId);
                var eyeOpen = document.getElementById(inputId + '-eye-open');
                var eyeClosed = document.getElementById(inputId + '-eye-closed');
                
                if (input.type === 'password') {
                    input.type = 'text';
                    eyeOpen.style.display = 'none';
                    eyeClosed.style.display = 'block';
                } else {
                    input.type = 'password';
                    eyeOpen.style.display = 'block';
                    eyeClosed.style.display = 'none';
                }
            }
        </script>
    </#if>
</@layout.registrationLayout>
