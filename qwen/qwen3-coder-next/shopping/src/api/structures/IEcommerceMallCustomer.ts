import { tags } from "typia";

import { IAuthorizationToken } from "./IAuthorizationToken";

export namespace IEcommerceMallCustomer {
  /**
   * Long-lived JWT refresh token for obtaining new access tokens without re-authentication. Stored in ecommerce_mall_customer_sessions table.
   */
  export type IRefresh = {
    /**
     * Long-lived refresh token for obtaining new access tokens without re-authentication.
     *
     * @x-autobe-database-schema-property refresh_token
     * @x-autobe-specification Refresh token value extracted from Authorization header. Validated against ecommerce_mall_customer_sessions table.
     */
    refresh_token: string;
  };

  /**
   * Customer login request containing email, password, and session context for authentication.
   */
  export type ILogin = {
    /**
     * Customer's email address for login authentication.
     *
     * @x-autobe-specification User's email address used for authentication. Must match an existing customer account in ecommerce_mall_customers.
     */
    email: string & tags.Format<"email">;

    /**
     * Customer's plain text password for authentication (server-side hashed).
     *
     * @x-autobe-specification Plain text password provided by user. Server-side hashing with bcrypt for secure storage in ecommerce_mall_customers.password_hash.
     */
    password: string & tags.Format<"password">;

    /**
     * URL where the login request originated from.
     *
     * @x-autobe-specification HTTP request URL where login request originated. Captured for session context and security auditing.
     */
    href: string & tags.Format<"uri">;

    /**
     * Referrer URL indicating the previous page that linked to the login.
     *
     * @x-autobe-specification HTTP referrer header value indicating the previous page that linked to the login page. Captured for session context and traffic analysis.
     */
    referrer: string & tags.Format<"uri">;

    /**
     * Client IP address for security auditing (optional, server-provided fallback).
     *
     * @x-autobe-specification Client IP address captured at login for security auditing. Server-provided fallback if not included in request.
     */
    ip?: (string & tags.Format<"ipv4">) | null | undefined;
  };

  /**
   * Customer authentication response with JWT tokens and customer identification.
   */
  export type IAuthorized = {
    /**
     * Short-lived JWT access token for authenticating API requests.
     *
     * @x-autobe-specification JWT access token from session table. Mapped to access_token column but exposed as JWT token in response DTO.
     */
    access_token: string;

    /**
     * Long-lived refresh token for obtaining new access tokens.
     *
     * @x-autobe-specification JWT refresh token from session table. Mapped to refresh_token column but exposed as JWT token in response DTO.
     */
    refresh_token: string;

    /**
     * ISO 8601 timestamp when the access token expires.
     *
     * @x-autobe-specification Session expiration timestamp from session table. Mapped to expires_at column but exposed as expired_at in response DTO.
     */
    expired_at: string & tags.Format<"date-time">;

    /**
     * Customer identification for the authenticated session.
     *
     * @x-autobe-specification Customer Summary from ecommerce_mall_customers via session table. Returns ISummary with id, email, is_suspended, created_at.
     */
    customer: IEcommerceMallCustomer.ISummary;

    /**
     * Authorization token.
     *
     * @x-autobe-specification Authorization token comes from the session table.
     */
    token: IAuthorizationToken;
  };

  /**
   * Request body for customer registration endpoint that creates a new customer account with email and password authentication.
   */
  export type IJoin = {
    /**
     * Customer's email address used for login and communication.
     *
     * @x-autobe-database-schema-property email
     * @x-autobe-specification Direct mapping from ecommerce_mall_customers.email. Unique constraint enforced at database level. Validation: required, email format.
     */
    email: string & tags.MinLength<1> & tags.Format<"email">;

    /**
     * Customer's password for authentication. Must be between 8 and 72 characters.
     *
     * @x-autobe-specification Transformation from password to password_hash via bcrypt hashing. Password provided by user is hashed with bcrypt cost factor 12 before storage. Required field with 8-72 character length constraint.
     */
    password: string &
      tags.MinLength<8> &
      tags.MaxLength<72> &
      tags.Format<"password">;

    /**
     * Customer's display name for profile identification.
     *
     * @x-autobe-specification Maps to customer_profile.display_name. Part of separate customer profile creation flow during registration. Required field with 1-50 character length constraint.
     */
    name?: (string & tags.MinLength<1> & tags.MaxLength<50>) | undefined;

    /**
     * Customer's phone number for contact and delivery purposes.
     *
     * @x-autobe-specification Maps to customer_profile.phone_number. Part of separate customer profile creation flow during registration. Required field with 1-15 character length constraint.
     */
    phone?: (string & tags.MinLength<1> & tags.MaxLength<15>) | undefined;

    /**
     * The referring URL that led the customer to the registration page.
     *
     * @x-autobe-specification Session context field stored in session record. Captures the referring URL when customer initiates registration. Required field in registration context for analytics and attribution tracking. SSR fallback: server captures request URL when client cannot determine.
     */
    href?: (string & tags.Format<"uri">) | undefined;

    /**
     * The marketing or referral source that brought the customer to the platform.
     *
     * @x-autobe-specification Session context field stored in session record. Captures the source that referred the customer (e.g., marketing campaign). Required field in registration context for analytics and attribution tracking. SSR fallback: server captures referrer header when client cannot determine.
     */
    referrer?: (string & tags.Format<"uri">) | undefined;

    /**
     * The customer's IP address for security and geo-location tracking.
     *
     * @x-autobe-specification Session context field stored in session record. Captures the customer's IP address for security and geo-location. Optional field in registration context for SSR fallback: if client provides it, use that; otherwise server captures the client's IP address. Format: IPv4 or IPv6.
     */
    ip?: (string & tags.Format<"ipv4">) | undefined;
  };

  /**
   * Minimal customer identification for list views and relation references.
   */
  export type ISummary = {
    /**
     * Unique customer identifier.
     *
     * @x-autobe-database-schema-property id
     * @x-autobe-specification Direct mapping from ecommerce_mall_customers.id.
     */
    id: string & tags.Format<"uuid">;

    /**
     * Customer's email address used for login and communication.
     *
     * @x-autobe-database-schema-property email
     * @x-autobe-specification Direct mapping from ecommerce_mall_customers.email. Unique constraint enforced.
     */
    email: string & tags.Format<"email">;

    /**
     * Whether the customer account is currently suspended.
     *
     * @x-autobe-specification Computed from account lifecycle state based on deleted_at and system suspension records.
     */
    is_suspended: boolean;

    /**
     * Timestamp when customer account was created.
     *
     * @x-autobe-database-schema-property created_at
     * @x-autobe-specification Direct mapping from ecommerce_mall_customers.created_at.
     */
    created_at: string & tags.Format<"date-time">;
  };
}
