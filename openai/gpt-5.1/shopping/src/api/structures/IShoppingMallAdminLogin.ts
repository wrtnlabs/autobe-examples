import { tags } from "typia";

export namespace IShoppingMallAdminLogin {
  /**
   * Request payload for administrator login on the shopping mall platform.
   *
   * This DTO carries the credential pair used to authenticate an existing
   * admin account, along with session context metadata that will be persisted
   * into the shopping_mall_admin_sessions table. It is designed specifically
   * for the POST /auth/admin/login operation and maps to the business
   * behavior described for locating an admin by email and validating the
   * supplied password against the stored password_hash.
   *
   * The email field identifies the candidate admin record in
   * shopping_mall_admins using its unique index. The password field contains
   * the plain-text password that will be verified server-side; it never
   * corresponds directly to the password_hash column and is not stored as-is.
   * The ip, href, and referrer fields provide contextual information for
   * session creation, filling the corresponding columns in
   * shopping_mall_admin_sessions so that each login can be audited and
   * analyzed for risk and abuse.
   *
   * This type must be used only for credential-based authentication flows. It
   * must not be reused for generic admin updates or profile changes, and it
   * intentionally excludes any actor identity fields such as admin IDs, which
   * are derived after authentication succeeds.
   */
  export type ICreate = {
    /**
     * Unique email address used as the primary login for the admin account.
     *
     * This value is used to query the shopping_mall_admins table via its
     * unique index on the email column to locate a candidate administrator
     * record. The address must follow standard email formatting rules and
     * should correspond to an internally managed admin identity, not a
     * customer or seller account.
     *
     * Authentication logic treats this field as case-insensitive according
     * to business rules, but the original casing may still be stored for
     * display purposes.
     */
    email: string & tags.Format<"email">;

    /**
     * Plain-text password submitted by the administrator for
     * authentication.
     *
     * The application uses this value only for verification against the
     * stored password_hash column in the shopping_mall_admins table. It is
     * never stored directly and is always processed through a secure
     * password hashing routine on the server side.
     *
     * Length and complexity requirements, such as minimum characters or
     * required character classes, are enforced by the authentication
     * service rather than encoded explicitly in this schema.
     */
    password: string & tags.Format<"password">;

    /**
     * Client IP address associated with the login attempt.
     *
     * This optional field allows the caller to provide an explicit IP
     * address which will be persisted into the ip column of the
     * shopping_mall_admin_sessions table. It supports both IPv4 and IPv6
     * formats and is primarily used for audit and security analytics.
     *
     * If null or omitted, the backend falls back to using the observed
     * network source IP. Servers are free to ignore misleading
     * client-provided values and rely on trusted connection metadata
     * instead.
     */
    ip?:
      | (string & tags.Format<"ipv4">)
      | (string & tags.Format<"ipv6">)
      | null
      | undefined;

    /**
     * Full URL at which the admin initiated the login.
     *
     * This value is recorded in the href column of the
     * shopping_mall_admin_sessions table so that each session can be traced
     * back to the exact entry point in the administrative interface. It
     * typically contains the absolute URL of the login page or application
     * route from which the credential form was submitted.
     *
     * Capturing this information assists in debugging, user support, and
     * security investigations by showing the context in which the login
     * occurred.
     */
    href: string & tags.Format<"uri">;

    /**
     * Referrer URL present when the login request was made.
     *
     * The authentication service persists this value into the referrer
     * column of the shopping_mall_admin_sessions table. It represents the
     * page or external site that led the administrator to the login URL and
     * is useful for analyzing navigation flows and detecting unusual access
     * paths.
     *
     * If the admin navigated directly to the login page, this may be an
     * empty string or a canonical landing page URL depending on client
     * behavior and configuration.
     */
    referrer: string & tags.Format<"uri">;
  };
}
