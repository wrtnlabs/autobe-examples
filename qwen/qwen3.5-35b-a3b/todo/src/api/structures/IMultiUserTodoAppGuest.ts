import { tags } from "typia";

import { IAuthorizationToken } from "./IAuthorizationToken";

export namespace IMultiUserTodoAppGuest {
  /**
   * Authenticated guest account with session token. Returned after successful guest registration or token refresh to provide the client with authentication credentials including the guest identifier and JWT-based authorization tokens for subsequent API requests.
   */
  export type IAuthorized = {
    /**
     * Unique identifier for the guest account.
     *
     * @x-autobe-database-schema-property id
     * @x-autobe-specification Direct mapping from multi_user_todo_app_guests.id. UUID primary key for guest account identification.
     */
    id: string & tags.Format<"uuid">;

    /**
     * Authorization token.
     *
     * @x-autobe-specification Authorization token comes from the session table.
     */
    token: IAuthorizationToken;
  };

  /**
   * Request body for refreshing a guest session token. Contains the refresh token used to obtain a new access token when the previous access token has expired.
   */
  export type IRefresh = {
    /**
     * The refresh token used to renew the guest session. A valid UUID identifying an active session in multi_user_todo_app_guest_sessions table.
     *
     * @x-autobe-specification Virtual authentication token used to validate the guest session. The server looks up the multi_user_todo_app_guest_sessions record by matching this token value. Must be a valid UUID format, not expired, and associated with an active guest account. Upon validation, a new session record is created with new access_token and refresh_token values.
     */
    refresh_token: string & tags.Format<"uuid">;
  };

  /**
   * Registration credentials for creating a new guest account in the multi-user todo application. Captures user identity (email, password) and session context (origin URL, referrer, device IP). Upon submission, a new guest account is created and JWT session is automatically issued.
   */
  export type IJoin = {
    /**
     * Unique email address for the guest account. Must be a valid email format and unique across all guest accounts.
     *
     * @x-autobe-database-schema-property email
     * @x-autobe-specification Direct mapping from multi_user_todo_app_guests.email. Required field, validated for proper email format and uniqueness against existing guests.
     */
    email: string & tags.Format<"email">;

    /**
     * Password for authentication. Required and will be securely hashed before storage.
     *
     * @x-autobe-database-schema-property password_hash
     * @x-autobe-specification Plain text password provided by user. Backend must hash this using bcrypt before storing as password_hash in multi_user_todo_app_guests.
     */
    password: string;

    /**
     * Origin URL where the registration was initiated. Captured for session tracking and analytics.
     *
     * @x-autobe-specification Origin URL from the request. Captured for session tracking purposes. Optional in IJoin/ILogin because in SSR the server captures it; this field allows client to provide it for consistency. Stored in guest_sessions table.
     */
    href: string & tags.Format<"uri">;

    /**
     * Referrer URL indicating the page or source that directed the user to the registration page.
     *
     * @x-autobe-specification Referrer URL from the request. Captured for session tracking purposes. Optional in IJoin/ILogin because in SSR the server captures it; this field allows client to provide it for consistency. Stored in guest_sessions table.
     */
    referrer: string & tags.Format<"uri">;

    /**
     * Device IP address. Used for session tracking and security. Optional as the server can capture it in SSR scenarios.
     *
     * @x-autobe-specification Device IP address captured from the request. Optional in IJoin/ILogin because in SSR the server captures it as fallback (body.ip ?? serverIp). Stored in guest_sessions table for session identification.
     */
    ip?: (string & tags.Format<"ipv4">) | undefined;
  };
}
