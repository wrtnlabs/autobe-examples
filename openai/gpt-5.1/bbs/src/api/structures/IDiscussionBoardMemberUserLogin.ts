import { tags } from "typia";

export namespace IDiscussionBoardMemberUserLogin {
  /**
   * Login credentials and session context for authenticating an existing
   * discussionBoard member user against the `discussion_board_memberusers`
   * table using email and password.
   */
  export type IRequest = {
    /**
     * Member user email address used as the unique login identifier in
     * `discussion_board_memberusers`.
     */
    email: string & tags.Format<"email">;

    /**
     * Plain-text password provided by the member user for authentication.
     * The backend hashes this value and compares it to the stored password
     * hash.
     */
    password: string;

    /**
     * Optional client IP address for session tracking and security
     * analytics. When omitted or null, the backend may infer IP from the
     * transport layer.
     */
    ip?: string | null | undefined;

    /**
     * Current page URL from which the login request is initiated. Used for
     * session context and security/audit logging.
     */
    href: string & tags.Format<"uri">;

    /**
     * Referrer URL (previous page URL) from which the user navigated before
     * initiating login. Used for session context and security/audit
     * logging.
     */
    referrer: string & tags.Format<"uri">;
  };
}
