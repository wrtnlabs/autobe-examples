import { tags } from "typia";

export namespace IDiscussionBoardAdminUserLogin {
  /**
   * Login request payload for an administrative user of the discussion board
   * service.
   *
   * This DTO is submitted to the admin login endpoint when an existing
   * administrator attempts to authenticate. It carries the admin's email and
   * plain-text password along with session context information (connection
   * metadata) used to create or update an admin session record in
   * `discussion_board_adminuser_sessions`.
   *
   * The service layer hashes the provided password and compares it against
   * `discussion_board_adminusers.password_hash`. No hashed password material
   * is ever accepted from the client, ensuring that credential handling
   * remains strictly under backend control.
   */
  export type IRequest = {
    /**
     * Email address of the administrative user attempting to log in.
     *
     * This must correspond to the unique `email` column in the
     * `discussion_board_adminusers` table. The login operation will fail
     * with an authentication error if no matching administrator exists or
     * if the account is not in an allowed lifecycle state.
     */
    email: string & tags.Format<"email">;

    /**
     * Plain-text password for the administrative user attempting to log in.
     *
     * The backend hashes this value using the configured password hashing
     * algorithm and compares the result with the stored `password_hash`
     * column in `discussion_board_adminusers`. Clients must never send
     * pre-hashed passwords; hashing is exclusively handled by the server.
     */
    password: string;

    /**
     * Optional IP address for the admin's current connection, used for
     * session and security auditing.
     *
     * When provided, this should be the client IP in a standard textual
     * representation (IPv4 or IPv6). If omitted or null, the backend may
     * derive the IP from the underlying HTTP request context.
     */
    ip?: string | null | undefined;

    /**
     * Connection URL (current page URL) at the time the login request is
     * initiated.
     *
     * This value is stored in `discussion_board_adminuser_sessions` to
     * provide contextual information about where the admin started their
     * session. It must be a valid absolute URI representing the frontend
     * location.
     */
    href: string & tags.Format<"uri">;

    /**
     * Referrer URL (previous page URL) that led to the login request.
     *
     * This value is used for security analysis and UX diagnostics and is
     * also recorded in `discussion_board_adminuser_sessions`. It should be
     * a valid absolute URI; when there is no referrer, clients may send a
     * generic landing URL according to frontend policy.
     */
    referrer: string & tags.Format<"uri">;
  };
}
