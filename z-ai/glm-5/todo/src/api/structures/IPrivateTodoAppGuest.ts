import { tags } from "typia";

import { IAuthorizationToken } from "./IAuthorizationToken";

export namespace IPrivateTodoAppGuest {
  /**
   * Request body for refreshing guest session tokens. Contains the refresh token that was previously issued to the guest during authentication or a prior refresh. The server validates the token and returns a new access/refresh token pair to maintain the session.
   */
  export type IRefresh = {
    /**
     * The refresh token to exchange for a new access token and refresh token pair. Must be a valid token previously issued to this guest.
     *
     * @x-autobe-specification Used to query private_todo_app_guest_sessions.refresh_token column for session validation. Must match an existing, non-expired, non-revoked session record. The token is validated for signature integrity and expiration before being accepted.
     */
    refresh_token: string;
  };

  /**
   * Request body for guest registration (sign up) in the private todo application. Guests provide their email address and password credentials to create a new member account. The email must be unique across all registered members. The password must meet the system's security requirements. Session context fields track the registration origin for security auditing.
   */
  export type IJoin = {
    /**
     * Email address for the new member account. Must be a valid email format and unique across all registered members in the system.
     *
     * @x-autobe-specification Validated for email format and uniqueness against private_todo_app_members.email column. Used to create new member record with unique email address. Must be unique across all registered members - duplicate emails result in 409 Conflict error.
     */
    email: string & tags.Format<"email">;

    /**
     * Password for the new member account. Must meet security requirements including minimum length and complexity standards. Stored securely as a hashed value.
     *
     * @x-autobe-specification Validated against password security requirements (minimum length, complexity). Hashed using secure algorithm (bcrypt/argon2) by service layer before storage as password_hashed column in private_todo_app_members table. Never stored in plaintext.
     */
    password: string & tags.Format<"password">;

    /**
     * The URL of the page where the registration form was submitted. Captured for security auditing and analytics purposes.
     *
     * @x-autobe-specification Captured from request context for security auditing and analytics. Stored in href column of private_todo_app_member_sessions table to track where the registration request originated.
     */
    href: string & tags.Format<"uri">;

    /**
     * The referring URL that led the user to the registration page. Captured for security auditing and analytics purposes.
     *
     * @x-autobe-specification Captured from HTTP Referer header for security auditing and analytics. Stored in referrer column of private_todo_app_member_sessions table to track how users arrived at the registration page.
     */
    referrer: string & tags.Format<"uri">;

    /**
     * Optional client IP address for security auditing. If omitted, the server automatically captures the client's IP address.
     *
     * @x-autobe-specification Optional client IP address for security auditing. If not provided in request body, server captures client IP as fallback. Stored in ip column of private_todo_app_member_sessions table for security tracking and fraud prevention.
     */
    ip?: (string & tags.Format<"ipv4">) | null | undefined;
  };

  /**
   * Authorization response for guest session operations. Contains the guest's unique identifier and JWT authentication tokens for maintaining an authenticated session state.
   */
  export type IAuthorized = {
    /**
     * Unique identifier for the authenticated guest.
     *
     * @x-autobe-database-schema-property id
     * @x-autobe-specification Direct mapping from private_todo_app_guests.id. UUID primary key identifying the guest.
     */
    id: string & tags.Format<"uuid">;

    /**
     * Authorization token.
     *
     * @x-autobe-specification Authorization token comes from the session table.
     */
    token: IAuthorizationToken;
  };
}
