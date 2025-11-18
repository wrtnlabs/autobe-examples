import { tags } from "typia";

export namespace IShoppingMallAdminJoin {
  /**
   * Data required to register a new shopping mall administrator account.
   *
   * This DTO captures the business-facing registration fields for creating a
   * record in the shopping_mall_admins table while establishing the initial
   * admin authentication context. It is designed specifically for the POST
   * /auth/admin/join operation and intentionally avoids exposing internal
   * database columns such as password_hash or deleted_at.
   *
   * The service layer maps this structure to the underlying Prisma model by
   * hashing the provided plain-text password into the password_hash column,
   * initializing lifecycle fields like status and email_verified according to
   * platform policy, and populating created_at and updated_at with the
   * current system time. This DTO is also responsible for carrying the
   * session context fields (ip, href, referrer) necessary to create an
   * initial row in shopping_mall_admin_sessions when the join operation
   * implicitly logs the admin in and issues JWT tokens.
   */
  export type ICreate = {
    /**
     * Admin email address that serves as the unique login identifier.
     *
     * This value is mapped to the email column of shopping_mall_admins and
     * must be unique across all administrator accounts due to the unique
     * index on that column. The join operation validates this constraint
     * and rejects any attempt to reuse an existing email, returning an
     * appropriate error to the client.
     *
     * From a business perspective, this email is also used for
     * administrative notifications and security communications such as
     * password reset or account alerts.
     */
    email: string & tags.Format<"email">;

    /**
     * Plain-text password used to secure the administrator account.
     *
     * The raw value supplied in this field is never stored directly in the
     * database. Instead, the backend hashes it and persists the result into
     * the password_hash column of shopping_mall_admins. This indirection
     * allows the API contract to remain stable even if the password storage
     * scheme changes.
     *
     * Password strength rules, such as minimum length or required character
     * classes, are enforced at the service layer based on platform security
     * policies.
     */
    password: string & tags.Format<"password">;

    /**
     * Client IP address associated with the initial authentication session
     * created during admin registration.
     *
     * This field is mapped conceptually to the ip column of
     * shopping_mall_admin_sessions and helps build a high-fidelity audit
     * trail. It is optional because many deployments prefer to derive the
     * IP server-side, but including it allows integration patterns such as
     * SSR frontends or proxies that explicitly forward the originating
     * address.
     *
     * When omitted or set to null, the service can still populate the
     * session IP using trusted request metadata.
     */
    ip?:
      | (string & tags.Format<"ipv4">)
      | (string & tags.Format<"ipv6">)
      | null
      | undefined;

    /**
     * Full URL from which the admin registration request was initiated.
     *
     * This value is recorded in the href column of
     * shopping_mall_admin_sessions and provides precise context about the
     * page or route where the join flow was completed. It is critical for
     * auditing, troubleshooting misconfigurations, and analyzing abuse
     * patterns across different entry points.
     *
     * Clients should send the exact browser or frontend URL, including
     * query parameters, to maintain an accurate session trail.
     */
    href: string & tags.Format<"uri">;

    /**
     * Referrer URL observed when the admin initiated the registration flow.
     *
     * This value is mapped to the referrer column of
     * shopping_mall_admin_sessions and allows the platform to understand
     * which page or external site directed the user into the join endpoint.
     * It is useful for security review, campaign attribution, and detecting
     * suspicious origin patterns.
     *
     * If there was no referrer (for example, a direct navigation), clients
     * may send an empty string or omit the field per frontend convention,
     * but servers may normalize values according to their own logging
     * strategy.
     */
    referrer: string & tags.Format<"uri">;
  };
}
