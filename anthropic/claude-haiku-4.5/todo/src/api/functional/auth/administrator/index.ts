import { IConnection, HttpError } from "@nestia/fetcher";
import { PlainFetcher } from "@nestia/fetcher/lib/PlainFetcher";
import typia from "typia";
import { NestiaSimulator } from "@nestia/fetcher/lib/NestiaSimulator";

import { IAdministratorLoginRequest } from "../../../structures/IAdministratorLoginRequest";
import { ITodoAppAdministrator } from "../../../structures/ITodoAppAdministrator";
import { IAdministratorRegistrationRequest } from "../../../structures/IAdministratorRegistrationRequest";
import { ITokenRefreshRequest } from "../../../structures/ITokenRefreshRequest";

/**
 * Administrator login endpoint for system operator authentication with JWT
 * token issuance.
 *
 * Administrator Login Authentication Endpoint
 *
 * This endpoint provides secure authentication mechanism for system
 * administrators to access the Todo application with elevated privileges.
 * Administrators submit their email address and password credentials, which are
 * validated against securely stored password hashes using bcrypt algorithm.
 * Upon successful credential validation, the system generates a JWT access
 * token containing administrator identification, role information, and
 * administrative level claims. The token is configured with 15-minute
 * expiration time for security purposes, requiring periodic re-authentication.
 * The token uses HMAC-SHA256 signing algorithm and includes claims:
 * administrator ID, email address, role set to 'administrator', admin level
 * (1-5), issuance timestamp (iat), and expiration timestamp (exp).
 *
 * Security Implementation and Protections:
 *
 * - WHEN an administrator submits login credentials, THE system SHALL validate
 *   the email address format and check if an administrator account exists with
 *   that email
 * - IF the email does not exist, THE system SHALL return generic error 'Invalid
 *   email or password' without confirming email existence (prevents user
 *   enumeration attacks)
 * - WHEN an administrator account exists, THE system SHALL retrieve the stored
 *   password hash and compare submitted password to stored hash using secure
 *   comparison function
 * - IF the password does not match, THE system SHALL increment
 *   failed_login_attempts counter for that account and return generic error
 *   message
 * - WHEN failed login attempts reach 5 within 15 minutes, THE system SHALL lock
 *   the administrator account and set locked_until timestamp to 15 minutes from
 *   current time
 * - WHEN an administrator account is locked, THE system SHALL deny login attempts
 *   and return error 'Account temporarily locked due to multiple failed login
 *   attempts. Please try again in 15 minutes.'
 * - IF the password matches, THE system SHALL reset failed_login_attempts to 0,
 *   verify that administrator status is 'active' (not 'inactive' or
 *   'suspended'), and verify that email_verified is true
 * - IF email not verified, THE system SHALL return error 'Please verify your
 *   email address before logging in'
 * - IF administrator account not active, THE system SHALL return error
 *   'Administrator account is inactive. Please contact system administrator.'
 * - WHEN all validations pass, THE system SHALL generate a new JWT access token
 *   with administrator claims
 *
 * Token Generation Process:
 *
 * - THE system SHALL create JWT token with header: {"alg": "HS256", "typ": "JWT"}
 * - THE system SHALL create payload containing: userId (administrator UUID),
 *   email (administrator email), role: 'administrator', isAdmin: true,
 *   adminLevel (integer 1-5), iat (current Unix timestamp), exp (current Unix
 *   timestamp + 900 seconds for 15 minute expiration), tokenType: 'access'
 * - THE system SHALL sign the token using HMAC-SHA256 algorithm with secure
 *   secret key stored in environment variables
 * - THE system SHALL never include password or sensitive information in token
 *   payload
 *
 * Session and Response Handling:
 *
 * - WHEN token generated successfully, THE system SHALL update last_login_at
 *   timestamp to current UTC time
 * - THE system SHALL initialize administrator session with 30-minute idle timeout
 *   and 24-hour absolute timeout
 * - THE system SHALL return JWT token to client via httpOnly secure cookie
 *   (preferred) or in response body
 * - THE system SHALL return HTTP 200 (OK) status code with complete response
 *   object containing access token, token type 'Bearer', expires_in (900
 *   seconds), and authenticated administrator information
 * - THE system SHALL log successful login event to security event log with
 *   event_type 'AUTHENTICATION_SUCCESS', admin email, and timestamp
 * - THE system SHALL prevent concurrent session issues by allowing multiple
 *   independent sessions from same administrator account on different devices
 *
 * Audit and Monitoring:
 *
 * - THE system SHALL create audit log entry for successful login with action_type
 *   'LOGIN', actor_type 'administrator', operation_status 'SUCCESS'
 * - THE system SHALL track administrator login patterns for anomaly detection
 * - THE system SHALL update failed_login_attempts and locked_until fields
 *   appropriately based on authentication outcome
 * - THE system SHALL store IP address and User-Agent from request for security
 *   monitoring
 * - THE system SHALL implement rate limiting: maximum 100 login attempts per 15
 *   minutes from same IP address to prevent brute force attacks
 *
 * Error Handling and Recovery:
 *
 * - IF database connection fails during login, THE system SHALL return error
 *   'TODOAPP-SYS-001: Unable to process login. Please try again later.'
 * - IF network timeout occurs, THE system SHALL retry up to 3 times with
 *   exponential backoff before returning error
 * - IF system is under maintenance, THE system SHALL return error
 *   'TODOAPP-SYS-006: System under maintenance. Please try again in a few
 *   moments.'
 * - IF token generation fails unexpectedly, THE system SHALL return error
 *   'TODOAPP-SYS-005: Server error. Our team has been notified. Please try
 *   again.'
 * - THE system SHALL NOT store administrator passwords in logs or error messages
 * - THE system SHALL NOT reveal whether email exists in system through error
 *   messages
 * - THE system SHALL NOT include stack traces or technical details in user-facing
 *   error responses
 *
 * Related Operations and Integration:
 *
 * - After successful login, administrators use the access token in Authorization
 *   header for all authenticated requests
 * - Token refresh endpoint (POST /auth/administrator/refresh) allows obtaining
 *   new access token using refresh token without re-login
 * - Logout endpoint (POST /auth/administrator/logout) invalidates current session
 *   and token
 * - Administrator registration endpoint (POST /auth/administrator/join) creates
 *   new administrator accounts
 * - This login endpoint integrates with todo_app_administrator table for
 *   credential validation and todo_app_failed_login_attempts tracking
 *
 * @param props.connection
 * @param props.body Administrator login credentials including email address and
 *   password
 * @setHeader token.access Authorization
 *
 * @path /auth/administrator/login
 * @accessor api.functional.auth.administrator.login
 * @autobe Generated by AutoBE - https://github.com/wrtnlabs/autobe
 */
export async function login(
  connection: IConnection,
  props: login.Props,
): Promise<login.Response> {
  const output: login.Response =
    true === connection.simulate
      ? login.simulate(connection, props)
      : await PlainFetcher.fetch(
          {
            ...connection,
            headers: {
              ...connection.headers,
              "Content-Type": "application/json",
            },
          },
          {
            ...login.METADATA,
            path: login.path(),
            status: null,
          },
          props.body,
        );
  connection.headers ??= {};
  connection.headers.Authorization = output.token.access;
  return output;
}
export namespace login {
  export type Props = {
    /** Administrator login credentials including email address and password */
    body: IAdministratorLoginRequest;
  };
  export type Body = IAdministratorLoginRequest;
  export type Response = ITodoAppAdministrator.IAuthorized;

  export const METADATA = {
    method: "POST",
    path: "/auth/administrator/login",
    request: {
      type: "application/json",
      encrypted: false,
    },
    response: {
      type: "application/json",
      encrypted: false,
    },
  } as const;

  export const path = () => "/auth/administrator/login";
  export const random = (): ITodoAppAdministrator.IAuthorized =>
    typia.random<ITodoAppAdministrator.IAuthorized>();
  export const simulate = (
    connection: IConnection,
    props: login.Props,
  ): Response => {
    const assert = NestiaSimulator.assert({
      method: METADATA.method,
      host: connection.host,
      path: login.path(),
      contentType: "application/json",
    });
    try {
      assert.body(() => typia.assert(props.body));
    } catch (exp) {
      if (!typia.is<HttpError>(exp)) throw exp;
      return {
        success: false,
        status: exp.status,
        headers: exp.headers,
        data: exp.toJSON().message,
      } as any;
    }
    return random();
  };
}

/**
 * Administrator registration endpoint for creating new system operator accounts
 * with email verification.
 *
 * Administrator Registration and Account Creation Endpoint
 *
 * This endpoint enables creation of new administrator accounts through secure
 * registration process. System operators submit email address and password
 * meeting security requirements, and the system creates a new administrator
 * account in pending verification state. The registration process includes
 * comprehensive validation, duplicate prevention, account initialization,
 * verification email generation, and detailed audit logging. Upon successful
 * registration, the administrator receives email verification link required to
 * activate the account before login becomes possible.
 *
 * Registration Input Validation:
 *
 * - WHEN an administrator registration request is received, THE system SHALL
 *   validate that both email and password fields are provided and not empty
 * - THE system SHALL validate email address format conforms to RFC 5321 standard
 *   (must contain @ symbol and valid domain)
 * - IF email format is invalid, THE system SHALL return HTTP 400 (Bad Request)
 *   with error code 'TODOAPP-VAL-001' and message 'Please enter a valid email
 *   address.'
 * - WHEN email format is valid, THE system SHALL check email uniqueness by
 *   querying todo_app_administrator table for existing account with same email
 * - IF email already exists in system, THE system SHALL return HTTP 409
 *   (Conflict) with error code 'TODOAPP-VAL-008' and message 'This email is
 *   already registered. Please log in with your existing account or use a
 *   different email address.'
 * - THE system SHALL validate password meets security requirements: minimum 8
 *   characters, at least one uppercase letter (A-Z), at least one lowercase
 *   letter (a-z), at least one numeric digit (0-9), at least one special
 *   character (!@#$%^&*)
 * - IF password does not meet requirements, THE system SHALL return HTTP 400 (Bad
 *   Request) with specific error message indicating which requirement failed:
 *   'Password must be at least 8 characters long.', 'Password must contain at
 *   least one uppercase letter.', 'Password must contain at least one lowercase
 *   letter.', 'Password must contain at least one numeric digit.', 'Password
 *   must contain at least one special character (!@#$%^&*).'
 * - THE system SHALL validate password does not reuse previous 5 passwords if
 *   administrator account existed previously
 *
 * Account Creation Process:
 *
 * - WHEN all validations pass, THE system SHALL generate new UUID for
 *   administrator ID
 * - THE system SHALL hash the submitted password using bcrypt algorithm with
 *   minimum 10 rounds and unique random salt
 * - THE system SHALL NEVER store password in plaintext under any circumstances
 * - THE system SHALL create new todo_app_administrator record with: id (generated
 *   UUID), email (provided email), password_hash (bcrypt hash), first_name
 *   (null), last_name (null), admin_level (default 1, minimal privileges),
 *   status ('active'), email_verified (false), created_at (current UTC
 *   timestamp), updated_at (current UTC timestamp), deleted_at (null)
 * - THE system SHALL set failed_login_attempts to 0 and locked_until to null for
 *   new account
 *
 * Email Verification Process:
 *
 * - WHEN administrator account created, THE system SHALL generate time-limited
 *   verification token (valid 24 hours)
 * - THE system SHALL create verification URL:
 *   'https://[domain]/auth/administrator/verify-email?token=[verification_token]'
 * - THE system SHALL send verification email to administrator's email address
 *   with: subject 'Verify your email address', body containing verification
 *   link and instructions
 * - THE system SHALL store verification token temporarily (24-hour expiration)
 * - THE system SHALL include in email: administrator first name (if provided,
 *   otherwise 'Administrator'), verification link, expiration time (24 hours),
 *   instructions for verification
 *
 * Response and Session Handling:
 *
 * - WHEN account created successfully, THE system SHALL return HTTP 201 (Created)
 *   status code
 * - THE system SHALL return response with: message 'Registration successful.
 *   Verification email sent to [email]. Please verify your email to activate
 *   your account.', email (masked slightly for display), resend_email_link
 *   (allows requesting another verification email)
 * - THE system SHALL NOT return password hash, authentication tokens, or other
 *   sensitive information
 * - THE system SHALL NOT automatically log in the administrator; email
 *   verification is required before access
 *
 * Audit and Security Logging:
 *
 * - THE system SHALL create audit log entry with: action_type 'REGISTER',
 *   entity_type 'ADMINISTRATOR', entity_id (new administrator ID), actor_type
 *   'system', operation_status 'SUCCESS', created_at (timestamp)
 * - THE system SHALL log security event with: event_type
 *   'ADMINISTRATOR_REGISTRATION', severity_level 'MEDIUM', event_source
 *   'REGISTRATION_ENDPOINT', event_description 'New administrator account
 *   registered', user_email (provided email), ip_address (from request),
 *   created_at (timestamp)
 * - THE system SHALL store IP address and User-Agent from registration request
 *   for fraud detection
 * - THE system SHALL implement rate limiting: maximum 10 registration attempts
 *   per hour from same IP address
 *
 * Email Verification Completion:
 *
 * - WHEN administrator clicks verification link with valid token, THE system
 *   SHALL mark account as email_verified (true), set email_verified_at to
 *   current UTC timestamp
 * - WHEN email verified, THE system SHALL display confirmation message 'Email
 *   verified successfully. Your account is now active. You can now log in with
 *   your credentials.'
 * - AFTER email verification, administrator can use login endpoint to
 *   authenticate and obtain access tokens
 * - IF verification token expired (older than 24 hours), THE system SHALL return
 *   error 'TODOAPP-AUTH-003: Verification link expired. Please request a new
 *   verification email.' with option to resend
 *
 * Error Handling and Edge Cases:
 *
 * - IF database error occurs during registration, THE system SHALL return error
 *   'TODOAPP-SYS-001: Unable to create account. Please try again later.'
 * - IF email sending fails, THE system SHALL return error 'TODOAPP-SYS-008:
 *   Unable to send verification email. Your account was created but please
 *   contact support to verify your email.'
 * - IF duplicate registration attempt (same email submitted twice rapidly), THE
 *   system SHALL detect and prevent duplicate account creation
 * - IF system reaches maximum administrator count limit, THE system SHALL return
 *   error 'TODOAPP-SYS-010: Maximum administrator accounts reached. Please
 *   contact system support.'
 * - THE system SHALL NOT reveal whether specific emails exist in system (use
 *   generic error messages)
 * - THE system SHALL handle special characters in email addresses correctly
 * - THE system SHALL NOT accept extremely long passwords (over 128 characters);
 *   maximum password length 128 characters
 *
 * Related Operations and Workflow:
 *
 * - After successful registration and email verification, administrator proceeds
 *   to login endpoint (POST /auth/administrator/login) to authenticate
 * - Password reset endpoint enables administrators to reset password if forgotten
 * - Email verification can be resent through separate endpoint if original email
 *   not received
 * - This registration endpoint is critical for initial system setup and
 *   administrator onboarding
 *
 * @param props.connection
 * @param props.body Administrator registration information including email and
 *   password for new account creation
 * @setHeader token.access Authorization
 *
 * @path /auth/administrator/join
 * @accessor api.functional.auth.administrator.join
 * @autobe Generated by AutoBE - https://github.com/wrtnlabs/autobe
 */
export async function join(
  connection: IConnection,
  props: join.Props,
): Promise<join.Response> {
  const output: join.Response =
    true === connection.simulate
      ? join.simulate(connection, props)
      : await PlainFetcher.fetch(
          {
            ...connection,
            headers: {
              ...connection.headers,
              "Content-Type": "application/json",
            },
          },
          {
            ...join.METADATA,
            path: join.path(),
            status: null,
          },
          props.body,
        );
  connection.headers ??= {};
  connection.headers.Authorization = output.token.access;
  return output;
}
export namespace join {
  export type Props = {
    /**
     * Administrator registration information including email and password
     * for new account creation
     */
    body: IAdministratorRegistrationRequest;
  };
  export type Body = IAdministratorRegistrationRequest;
  export type Response = ITodoAppAdministrator.IAuthorized;

  export const METADATA = {
    method: "POST",
    path: "/auth/administrator/join",
    request: {
      type: "application/json",
      encrypted: false,
    },
    response: {
      type: "application/json",
      encrypted: false,
    },
  } as const;

  export const path = () => "/auth/administrator/join";
  export const random = (): ITodoAppAdministrator.IAuthorized =>
    typia.random<ITodoAppAdministrator.IAuthorized>();
  export const simulate = (
    connection: IConnection,
    props: join.Props,
  ): Response => {
    const assert = NestiaSimulator.assert({
      method: METADATA.method,
      host: connection.host,
      path: join.path(),
      contentType: "application/json",
    });
    try {
      assert.body(() => typia.assert(props.body));
    } catch (exp) {
      if (!typia.is<HttpError>(exp)) throw exp;
      return {
        success: false,
        status: exp.status,
        headers: exp.headers,
        data: exp.toJSON().message,
      } as any;
    }
    return random();
  };
}

/**
 * Administrator token refresh endpoint for obtaining new access tokens with
 * extended session duration.
 *
 * Administrator Token Refresh Endpoint
 *
 * This endpoint enables system administrators to obtain new access tokens using
 * valid refresh tokens, extending their authenticated sessions without
 * requiring re-login. When an access token approaches expiration (15-minute
 * window), administrators can submit their refresh token to obtain a new access
 * token. The refresh token process includes comprehensive validation: signature
 * verification, expiration checking, token rotation, and security event
 * logging. Refresh tokens themselves expire after 7 days, requiring
 * administrators to log in again if no refresh activity occurs within that
 * window. This endpoint is publicly accessible but validates token authenticity
 * through cryptographic signature verification.
 *
 * Refresh Token Validation:
 *
 * - WHEN an administrator submits a refresh token, THE system SHALL extract the
 *   token from request body
 * - THE system SHALL validate refresh token has correct format (valid JWT with
 *   three Base64-encoded sections)
 * - THE system SHALL decode refresh token header and verify algorithm matches
 *   expected value (HS256)
 * - THE system SHALL verify refresh token signature using the refresh token
 *   signing key, ensuring token has not been tampered with
 * - IF signature verification fails, THE system SHALL return HTTP 401
 *   (Unauthorized) with error code 'TODOAPP-AUTH-004' and message 'Invalid
 *   refresh token. Please log in again.'
 * - THE system SHALL decode refresh token payload and extract claims:
 *   administratorId, email, role, tokenType ('refresh'), iat (issued at), exp
 *   (expiration timestamp)
 * - IF token payload is malformed or missing required claims, THE system SHALL
 *   return HTTP 401 (Unauthorized) with error code 'TODOAPP-AUTH-005' and
 *   message 'Refresh token is invalid. Please log in again.'
 *
 * Token Expiration Verification:
 *
 * - WHEN refresh token claims extracted, THE system SHALL compare token's exp
 *   (expiration) claim to current Unix timestamp
 * - IF current time >= token.exp, THE system SHALL treat token as expired
 * - IF refresh token is expired, THE system SHALL return HTTP 401 (Unauthorized)
 *   with error code 'TODOAPP-AUTH-002' and message 'Your refresh token has
 *   expired. Please log in again.'
 * - THE system SHALL include hint in error message: 'Refresh tokens expire after
 *   7 days of inactivity. Please log in to start a new session.'
 *
 * Administrator Account Verification:
 *
 * - WHEN refresh token is valid and not expired, THE system SHALL extract
 *   administratorId from token claims
 * - THE system SHALL query todo_app_administrator table for account with matching
 *   ID
 * - IF administrator account does not exist, THE system SHALL return HTTP 404
 *   (Not Found) with error code 'TODOAPP-AUTH-006' and message 'Administrator
 *   account not found.'
 * - WHEN administrator account found, THE system SHALL verify account status is
 *   'active' (not 'inactive' or 'suspended')
 * - IF administrator status is not 'active', THE system SHALL return HTTP 403
 *   (Forbidden) with error code 'TODOAPP-AUTH-007' and message 'Administrator
 *   account is inactive. Access denied.'
 * - THE system SHALL verify email_verified is true for the account
 * - IF email not verified, THE system SHALL return HTTP 403 (Forbidden) with
 *   error code 'TODOAPP-AUTH-003' and message 'Email verification required
 *   before token refresh.'
 *
 * New Access Token Generation:
 *
 * - WHEN all validation checks pass, THE system SHALL generate new JWT access
 *   token with administrator claims
 * - THE system SHALL create access token with header: {"alg": "HS256", "typ":
 *   "JWT"}
 * - THE system SHALL create access token payload containing: userId
 *   (administrator UUID from refresh token), email (administrator email from
 *   refresh token), role: 'administrator', isAdmin: true, adminLevel (from
 *   administrator account record), iat (current Unix timestamp), exp (current
 *   Unix timestamp + 900 seconds for 15-minute expiration), tokenType:
 *   'access'
 * - THE system SHALL sign access token using HMAC-SHA256 with access token
 *   signing key
 * - THE system SHALL optionally generate new refresh token with 7-day expiration
 *   for token rotation security: iat (current timestamp), exp (current
 *   timestamp + 604800 seconds), tokenType: 'refresh'
 *
 * Response and Session Handling:
 *
 * - WHEN tokens generated successfully, THE system SHALL return HTTP 200 (OK)
 *   status code
 * - THE system SHALL return response object containing: access_token (new JWT
 *   access token), token_type: 'Bearer', expires_in (900 seconds),
 *   refresh_token (optional new refresh token if rotating), administrator_id,
 *   email, admin_level
 * - THE system SHALL transmit access token to client via httpOnly secure cookie
 *   (preferred) or in response body
 * - THE system SHALL NOT include password hash or sensitive account information
 *   in response
 * - THE system SHALL update administrator's last_login_at to current timestamp
 *   even though this is not a full login
 *
 * Audit and Security Logging:
 *
 * - THE system SHALL create security event log entry with: event_type
 *   'TOKEN_REFRESH', severity_level 'LOW', event_source
 *   'TOKEN_REFRESH_ENDPOINT', event_description 'Administrator token
 *   refreshed', user_id (administrator ID), user_email (administrator email),
 *   ip_address (from request), action_taken 'TOKEN_ISSUED', created_at
 *   (timestamp)
 * - THE system SHALL create audit log entry with: action_type 'TOKEN_REFRESH',
 *   entity_type 'ADMIN_SESSION', entity_id (administrator ID), actor_type
 *   'administrator', actor_id (administrator ID), operation_status 'SUCCESS',
 *   created_at (timestamp)
 * - THE system SHALL log token refresh attempts (both successful and failed) for
 *   monitoring
 * - THE system SHALL track refresh token usage for anomaly detection
 *
 * Error Handling and Edge Cases:
 *
 * - IF refresh token was previously used for refresh (token rotation
 *   implemented), THE system SHALL return error 'TODOAPP-AUTH-008: This refresh
 *   token has already been used. Please log in again.' to prevent token reuse
 *   attacks
 * - IF refresh token signature valid but account data changed since token issued,
 *   THE system SHALL generate new token with current account data
 * - IF request missing refresh token entirely, THE system SHALL return HTTP 400
 *   (Bad Request) with error code 'TODOAPP-AUTH-001' and message 'Refresh token
 *   is required.'
 * - IF database connection fails during validation, THE system SHALL return error
 *   'TODOAPP-SYS-001: Unable to process token refresh. Please try again.'
 * - IF system time is significantly different from token creation time (clock
 *   skew), THE system SHALL attempt time synchronization
 * - THE system SHALL implement rate limiting: maximum 100 refresh requests per
 *   minute per administrator to prevent token refresh abuse
 * - THE system SHALL NOT reveal whether specific tokens exist in system through
 *   error messages
 *
 * Security Considerations:
 *
 * - THE system SHALL never log complete tokens in any logs; only log token
 *   identifiers if necessary
 * - THE system SHALL transmit tokens only over HTTPS/TLS encrypted connections
 * - THE system SHALL validate token signature with every refresh request using
 *   secure comparison functions
 * - THE system SHALL use different signing keys for access tokens and refresh
 *   tokens
 * - THE system SHALL implement token blacklist for revoked refresh tokens if
 *   needed
 * - THE system SHALL validate user agent consistency if possible to detect token
 *   theft
 *
 * Related Operations and Workflow:
 *
 * - Before token expires (15 minutes), administrator should call this refresh
 *   endpoint to maintain session
 * - If refresh token expires (7 days without refresh), administrator must use
 *   login endpoint to authenticate again
 * - Logout endpoint invalidates both access and refresh tokens
 * - This endpoint should be called proactively when access token approaches
 *   expiration, not reactively after expiration
 * - Integration with todo operations: all authenticated todo endpoints require
 *   valid, non-expired access token
 *
 * @param props.connection
 * @param props.body Refresh token for obtaining new access token without
 *   re-authentication
 * @setHeader token.access Authorization
 *
 * @path /auth/administrator/refresh
 * @accessor api.functional.auth.administrator.refresh
 * @autobe Generated by AutoBE - https://github.com/wrtnlabs/autobe
 */
export async function refresh(
  connection: IConnection,
  props: refresh.Props,
): Promise<refresh.Response> {
  const output: refresh.Response =
    true === connection.simulate
      ? refresh.simulate(connection, props)
      : await PlainFetcher.fetch(
          {
            ...connection,
            headers: {
              ...connection.headers,
              "Content-Type": "application/json",
            },
          },
          {
            ...refresh.METADATA,
            path: refresh.path(),
            status: null,
          },
          props.body,
        );
  connection.headers ??= {};
  connection.headers.Authorization = output.token.access;
  return output;
}
export namespace refresh {
  export type Props = {
    /**
     * Refresh token for obtaining new access token without
     * re-authentication
     */
    body: ITokenRefreshRequest;
  };
  export type Body = ITokenRefreshRequest;
  export type Response = ITodoAppAdministrator.IAuthorized;

  export const METADATA = {
    method: "POST",
    path: "/auth/administrator/refresh",
    request: {
      type: "application/json",
      encrypted: false,
    },
    response: {
      type: "application/json",
      encrypted: false,
    },
  } as const;

  export const path = () => "/auth/administrator/refresh";
  export const random = (): ITodoAppAdministrator.IAuthorized =>
    typia.random<ITodoAppAdministrator.IAuthorized>();
  export const simulate = (
    connection: IConnection,
    props: refresh.Props,
  ): Response => {
    const assert = NestiaSimulator.assert({
      method: METADATA.method,
      host: connection.host,
      path: refresh.path(),
      contentType: "application/json",
    });
    try {
      assert.body(() => typia.assert(props.body));
    } catch (exp) {
      if (!typia.is<HttpError>(exp)) throw exp;
      return {
        success: false,
        status: exp.status,
        headers: exp.headers,
        data: exp.toJSON().message,
      } as any;
    }
    return random();
  };
}
