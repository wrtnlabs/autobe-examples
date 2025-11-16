import { tags } from "typia";

export namespace IShoppingMallPlatformAdminLogin {
  /**
   * Login credentials and session context for a platform administrator
   * attempting to sign in.
   *
   * Includes the administrator's email and password along with connection
   * metadata required to create a platformadmin session record, such as
   * client IP address and page URLs.
   */
  export type IRequest = {
    /**
     * Platform administrator email address used as the unique login
     * identifier within the platformAdmin actor scope.
     */
    email: string & tags.Format<"email">;

    /**
     * Plain-text password submitted by the platform administrator for
     * authentication. The backend hashes and compares this against the
     * stored password hash.
     */
    password: string;

    /**
     * Client IP address for the login attempt, used for security analytics
     * and audit logging. When omitted or null, the server may infer the IP
     * from the incoming request.
     */
    ip?: string | null | undefined;

    /**
     * Full URL of the page from which the login request originated. Used to
     * populate the admin session context and auth logs.
     */
    href: string & tags.Format<"uri">;

    /**
     * Referrer URL indicating the previous page that led to the login
     * action. Used for session context and security auditing.
     */
    referrer: string & tags.Format<"uri">;
  };
}
