import { tags } from "typia";

export namespace IShoppingMallPlatformAdminJoin {
  /**
   * Request payload for registering a new platform administrator and creating
   * initial authentication credentials.
   *
   * This DTO is used by POST /auth/platformAdmin/join to insert rows into
   * shopping_mall_platformadmin and shopping_mall_auth_credentials (scoped
   * with actor_type = "platformAdmin"), bind them via
   * shopping_mall_auth_credentials_of_platformadmins, and open an initial
   * shopping_mall_platformadmin_sessions record.
   *
   * It contains administrator profile fields plus the plain‑text password to
   * be hashed and stored in shopping_mall_auth_credentials.password_hash. It
   * also carries session context fields (ip, href, referrer) so that the
   * initial admin session can be recorded in
   * shopping_mall_platformadmin_sessions and related security/audit logs.
   */
  export type IRequest = {
    /**
     * Platform administrator email address. Must be unique for actor_type =
     * "platformAdmin" across shopping_mall_platformadmin and
     * shopping_mall_auth_credentials. Used both as login identifier and
     * primary contact email.
     */
    email: string & tags.Format<"email">;

    /**
     * Display name of the platform administrator as stored in
     * shopping_mall_platformadmin.name.
     */
    name: string;

    /**
     * Plain‑text password chosen by the new platform administrator. The
     * backend hashes this value and stores it as password_hash in
     * shopping_mall_auth_credentials. Must satisfy the platform's password
     * strength policy.
     */
    password: string;

    /**
     * Optional client IP address for the joining admin session. When
     * provided, it is stored in shopping_mall_platformadmin_sessions.ip and
     * may be copied into shopping_mall_auth_logs and
     * shopping_mall_security_events.
     */
    ip?: string | null | undefined;

    /**
     * Current page URL at the time of registration. Stored in
     * shopping_mall_platformadmin_sessions.href to capture session
     * establishment context and may also be referenced by auth/security
     * logs.
     */
    href: string & tags.Format<"uri">;

    /**
     * Referrer URL from which the admin registration flow was initiated.
     * Stored in shopping_mall_platformadmin_sessions.referrer for
     * auditability and risk analysis.
     */
    referrer: string & tags.Format<"uri">;
  };
}
