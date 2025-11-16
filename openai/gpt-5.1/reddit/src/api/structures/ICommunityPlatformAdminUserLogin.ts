import { tags } from "typia";

export namespace ICommunityPlatformAdminUserLogin {
  /**
   * Login request payload for authenticating an administrative user
   * (adminUser) using either username or email plus password. This DTO is
   * used by the adminUser login endpoint to initiate a new authenticated
   * session. It also carries session-context metadata used for security
   * analytics and session tables.
   */
  export type IRequest = {
    /**
     * Login identifier used to locate the adminUser account. Typically this
     * is either the adminUser's username or email address as stored in
     * community_platform_adminusers.
     */
    identifier: string;

    /**
     * Plain-text password provided by the adminUser for authentication. The
     * backend compares this against the stored password_hash for the
     * matched adminUser account.
     */
    password: string;

    /**
     * Optional client IP address for this login attempt. When provided, it
     * is stored into login-attempt and/or session records; when omitted or
     * null the server will infer IP from the HTTP request.
     */
    ip?: string | null | undefined;

    /**
     * Full URL of the page from which the login request originated.
     * Captured as session context and for security analytics and audit
     * trails.
     */
    href: string & tags.Format<"uri">;

    /**
     * Referrer URL indicating the previous page before the login request.
     * Used for session context, security analysis, and audit logging.
     */
    referrer: string & tags.Format<"uri">;
  };
}
