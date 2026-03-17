import { tags } from "typia";

import { IAuthorizationToken } from "./IAuthorizationToken";

export namespace IEcommerceMallGuest {
  /**
   * Request body for guest account registration. This operation creates a new guest account for unauthenticated platform visitors, allowing them to browse the platform with temporary credentials. The email and password are validated against business rules, and JWT tokens are generated upon successful registration.
   */
  export type IJoin = {
    /**
     * Guest email address for account identification.
     *
     * @x-autobe-database-schema-property email
     * @x-autobe-specification Direct mapping from ecommerce_mall_guests.email column. String email format.
     */
    email: (string & tags.Format<"email">) | null;

    /**
     * Guest's password for authentication.
     *
     * @x-autobe-specification Plaintext password for auth. Server hashes and compares against DB. Password validation: minimum length 8, complexity requirements enforced by backend.
     */
    password: string & tags.Format<"password">;
    href: string & tags.Format<"uri">;
    referrer: string & tags.Format<"uri">;

    /**
     * Client IP address at registration time.
     *
     * @x-autobe-database-schema-property ip
     * @x-autobe-specification Client IP. Optional: server uses body.ip ?? serverIp for SSR fallback.
     */
    ip?: (string & tags.Format<"ipv4">) | undefined;

    /**
     * Browser User-Agent string for device identification.
     *
     * @x-autobe-database-schema-property user_agent
     * @x-autobe-specification Direct mapping from ecommerce_mall_guests.user_agent column. Browser User-Agent string for device identification.
     */
    user_agent: string | null;
  };

  /**
   * Authorization response containing the guest actor's unique identifier and authentication tokens after successful registration or token renewal. This DTO provides the client with credentials to access protected resources using JWT-based authentication.
   */
  export type IAuthorized = {
    /**
     * The unique identifier of the guest actor.
     *
     * @x-autobe-database-schema-property id
     * @x-autobe-specification Direct mapping from ecommerce_mall_guests.id (UUID primary key).
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
   * Request payload for refreshing a guest's JWT access token. Clients send the refresh token obtained during initial guest session creation to obtain new access and refresh token pairs without re-registering. The refresh token has a 7-day validity window, enabling extended browsing sessions.
   */
  export type IRefresh = {
    /**
     * JWT refresh token issued during guest session creation. Used to obtain new access tokens without re-registration. Valid for 7 days from session creation.
     *
     * @x-autobe-specification Refresh token value from ecommerce_mall_guest_sessions.refresh_token field. The token is validated against stored value in session record, expiration checked, and used to generate new access+refresh token pair. Token stored securely in session table during guest join operation.
     */
    refresh_token: string;
  };
}
