import { TypedBody, TypedRoute } from "@nestia/core";
import { Controller, Ip } from "@nestjs/common";
import typia from "typia";

import { IEconomicBoardAdministrator } from "../../../../api/structures/IEconomicBoardAdministrator";
import { postEconomicBoardAuthAdministratorJoin } from "../../../../providers/postEconomicBoardAuthAdministratorJoin";
import { postEconomicBoardAuthAdministratorLogin } from "../../../../providers/postEconomicBoardAuthAdministratorLogin";
import { postEconomicBoardAuthAdministratorRefresh } from "../../../../providers/postEconomicBoardAuthAdministratorRefresh";

@Controller("/economicBoard/auth/administrator")
export class EconomicboardAuthAdministratorController {
  /**
   * This operation is executed as a system-integrated process following the approval of an administrator request by a super administrator. The system generates a new authentication token pair for a user whose role was elevated from citizen to administrator. The request includes the user's email and password, which are verified against the existing credentials stored in the economic_board_administrators table. Since the user existed previously as a citizen, their email and password_hash values were already validated during registration. Upon request approval, the system updates admin_request_status from 'pending' to 'approved', and then immediately generates a JWT access token (15-minute expiration) and a refresh token (14-day expiration) using these validated credentials. The user's account is now authenticated as an administrator, and the IAuthorized response includes the token pair along with their identity: id, email, display_name, and role. This operation ensures seamless transition from citizen to administrator without requiring re-registration or credential change, and leverages the existing password hash stored in the administrator table. The documentation is self-referential to the actor's hidden promotion workflow as defined in the requirements, not a public-facing endpoint.
   *
   * The security model for this operation is strict. The endpoint is not accessible to regular citizens or administrators; it is triggered internally by a super administrator's approval action. Therefore, the authorizationType is set to "join" because it represents the initial authorization of the newly promoted actor. The email field ensures the system selects the correct user from the economic_board_administrators table, and the password_hash is verified cryptographically. The ban status and is_banned flag are checked to prevent promotion of banned accounts. The operation only proceeds if admin_request_status is 'approved', confirming the system-validated administrative decision.
   *
   * The relationship to the authorization flow is critical: this operation represents the final step in the administrator promotion pipeline. Action does not occur until the super administrator's approval completes, which is why the operation does not exist as a public endpoint. The user's authentication identity remains the same as their citizen identity, but the context changes to elevated permissions. This is reflected in the IAuthorized response, which includes role: "administrator" rather than "citizen".
   *
   * The system guarantees security by maintaining separate session management for administrator roles. The refresh token is stored in an httpOnly, Secure, SameSite=Strict cookie, as per session security requirements. All tokens are signed using HS256 with a 256-bit secret key, and are validated server-side on every protected resource access. No other authentication fields (e.g.,iot_verified, password_reset_token) are involved because this is a role transition, not a password reset or email verification event, so these fields are irrelevant to this workflow.
   *
   * This operation also enforces the 'one user, one identity' principle: a user cannot have multiple authenticated sessions as citizen and administrator simultaneously. Once the join operation executes and tokens are issued, any active citizen session is immediately invalidated. This prevents session hijacking and ensures consistent permission context.
   *
   * @setHeader token.access Authorization
   *
   * @param connection
   * @param body Request body for the administrator join operation, used upon promotion from citizen to administrator by a super administrator. Must contain email and password fields for authentication against the existing citizen credentials.
   * @x-autobe-authorization-type join
   * @x-autobe-authorization-actor administrator
   * @x-autobe-specification The join operation is triggered when a citizen submits an admin request that has been approved by a super administrator. The system does not expose this as a direct endpoint for citizens; instead, it is an internal workflow. When the approval occurs, the system generates a JWT access token and refresh token for the user, whose role is updated from citizen to administrator. The request body contains the email and password to authenticate the new administrator role, using the same existing credentials as the citizen account. The response returns an IAuthorized DTO with access_token, refresh_token, and user object containing id, email, display_name, and role. Since the user already has an existing account, this is a role escalation, not a new registration. The service verifies admin_request_status is 'approved' before issuing tokens.
   * @nestia Generated by Nestia - https://github.com/samchon/nestia
   */
  @TypedRoute.Post("join")
  public async join(
    @Ip()
    ip: string,
    @TypedBody()
    body: IEconomicBoardAdministrator.IJoin,
  ): Promise<IEconomicBoardAdministrator.IAuthorized> {
    try {
      return await postEconomicBoardAuthAdministratorJoin({
        ip,
        body,
      });
    } catch (error) {
      console.log(error);
      throw error;
    }
  }

  /**
   * This operation authenticates a user with administrator privileges using email and password credentials. The system queries the economic_board_administrators table using the provided email address to locate the user's record. It then cryptographically verifies the provided password against the stored password_hash field using bcrypt with cost factor 12, as per security requirements. The operation checks the is_banned flag: if true, access is denied, and a 403 Forbidden response with account banned message is returned. Upon successful verification, it generates a JSON Web Token (JWT) access token with a 15-minute expiration and a refresh token with a 14-day expiration, both signed using HS256 with a 256-bit secret key. The refresh token is written to an HTTP-only, Secure, SameSite=Strict cookie to prevent XSS attacks, while the access token is returned in the response body.
   *
   * The user object returned in the response contains id, email, display_name, and role (administrator), as defined in the IEconomicBoardAdministrator.IAuthorized schema. The displayed name is rendered based on the display_name field, which may be null; if so, the system falls back to generating a display name from the email prefix. This ensures UI consistency where profile information is displayed. The function also logs the successful login into the economic_board_administrator_sessions table, capturing the client's IP address (from request headers), current page href, and referrer URL for audit and threat detection purposes. The session expires based on the refresh token’s 14-day lifecycle, unless manually revoked by password change, account deletion, or ban.
   *
   * This operation is critical because it is the foundation of the administrator’s authenticated session. It differs from the join operation in that join is triggered by an internal promotion event, whereas login is a direct user-initiated action to begin an authenticated session. The authorization type is set to "login" to distinguish it from registration-type operations. The request body has no collateral fields beyond email and password to minimize attack surface. No additional validation (e.g., email verification) is required because the promoter already validated the user identity during the joining process or prior registration. This operation respects role isolation — a citizen cannot use an administrator’s email to gain access, because administrator users are stored exclusively in the economic_board_administrators table and are not accessible via citizen endpoints.
   *
   * @setHeader token.access Authorization
   *
   * @param connection
   * @param body Request body for the administrator login operation, containing credentials used to authenticate an administrator account. Must include email and password fields for validation against the stored password_hash.
   * @x-autobe-authorization-type login
   * @x-autobe-authorization-actor administrator
   * @x-autobe-specification The login operation authenticates an administrator using their email and password. The system validates against the economic_board_administrators table. If successful, it generates a 15-minute access token and a 14-day refresh token; refresh token is stored in an httpOnly, Secure, SameSite=Strict cookie. The response includes the user’s identity (id, email, display_name, role). OTP or 2FA is not required. Session tracking is implemented via IP and device fingerprint for anomaly detection. The operation then logs the login event with timestamp, IP, href, and referrer in economic_board_administrator_sessions. If credentials are invalid or account is banned, returns 401 or 403 accordingly.
   * @nestia Generated by Nestia - https://github.com/samchon/nestia
   */
  @TypedRoute.Post("login")
  public async login(
    @Ip()
    ip: string,
    @TypedBody()
    body: IEconomicBoardAdministrator.ILogin,
  ): Promise<IEconomicBoardAdministrator.IAuthorized> {
    try {
      return await postEconomicBoardAuthAdministratorLogin({
        ip,
        body,
      });
    } catch (error) {
      console.log(error);
      throw error;
    }
  }

  /**
   * This operation refreshes a user's authentication session by replacing an expired access token with a new one, using a previously issued and still-valid refresh token. The refresh token is stored securely in an HTTP-only, Secure, SameSite=Strict cookie and is not accessible to client-side JavaScript. When a client makes a request to this endpoint, the server extracts the refresh token from the cookie and validates its cryptographic signature using the same HS256 secret key used at token issuance. The system then checks the economic_board_administrator_sessions table to confirm that the token exists, has not been revoked or expired, and is tied to a valid administrator account (identified by the email in the token payload). The session must be active and not marked for deletion. The system also verifies that the administrator's account is not banned by checking the is_banned flag in the economic_board_administrators table.
   *
   * If validation succeeds, the system issues a new access token (with 15-minute expiry) and a new refresh token (with 14-day expiry). The old refresh token is immediately invalidated by deleting its entry from economic_board_administrator_sessions, ensuring the token can only be used once. The new refresh token is stored in a new cookie with the same security properties (HTTP-only, Secure, SameSite=Strict), and the new access token is returned in the response body. The newly issued refresh token inherits the same user identity as the original, so the user retains their administrator permissions continuously without re-authentication.
   *
   * The operation is essential for maintaining seamless user experience without requiring frequent re-logins. It follows the security principle of short-lived access tokens and long-lived but single-use refresh tokens. The refresh mechanism does not require user interaction beyond the initial authentication and is used automatically during protected API requests when the access token expires. No additional parameters are required, and all sources of identity derive from the secure cookie token. This prevents replay attacks and ensures that even if a token is intercepted mid-flight, it will be immediately invalidated on first use. The response structure adheres strictly to the IEconomicBoardAdministrator.IAuthorized type, ensuring consistency in token handling across all authentication operations.
   *
   * @setHeader token.access Authorization
   *
   * @param connection
   * @param body No request body is required for the refresh operation. Authentication is performed entirely via the refresh token stored in the HTTP-only cookie.
   * @x-autobe-authorization-type refresh
   * @x-autobe-authorization-actor administrator
   * @x-autobe-specification This operation renews an expired access token using a valid refresh token stored in an HTTP-only cookie. It validates the refresh token's signature, existence in the database, and expiration. If valid, it issues a new 15-minute access token and a new 14-day refresh token, then rotates the tokens (invalidates the old refresh token). The user is identified via the email in the refresh token payload. The refresh tokens are single-use and stored in economic_board_administrator_sessions with an expiry timestamp.
   * @nestia Generated by Nestia - https://github.com/samchon/nestia
   */
  @TypedRoute.Post("refresh")
  public async refresh(
    @TypedBody()
    body: IEconomicBoardAdministrator.IRefresh,
  ): Promise<IEconomicBoardAdministrator.IAuthorized> {
    try {
      return await postEconomicBoardAuthAdministratorRefresh({
        body,
      });
    } catch (error) {
      console.log(error);
      throw error;
    }
  }
}
