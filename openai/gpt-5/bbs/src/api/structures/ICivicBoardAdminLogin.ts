import { tags } from "typia";

export namespace ICivicBoardAdminLogin {
  /**
   * Administrator login request DTO. Validates credentials against
   * civic_board_admins (email, password_hash) and establishes a session row
   * in civic_board_admin_sessions capturing connection context (ip, href,
   * referrer). Per security guidance, href and referrer are required; ip is
   * optional and may be provided or captured server-side. This type does not
   * map directly to a single Prisma model as it drives multiple actions (auth
   * verification and session creation).
   */
  export type ICreate = {
    /**
     * Administrator email credential. Must match civic_board_admins.email
     * (unique).
     */
    email: string & tags.Format<"email">;

    /**
     * Administrator password in plain text for verification against
     * civic_board_admins.password_hash. Never stored; the backend hashes
     * and compares securely.
     */
    password: string & tags.MinLength<1>;

    /**
     * Client IP address for session context. Optional; server may extract
     * from request (IPv4 or IPv6). Included here for SSR or proxied
     * scenarios.
     */
    ip?:
      | (string & tags.Format<"ipv4">)
      | (string & tags.Format<"ipv6">)
      | null
      | undefined;

    /**
     * Connection URL (current page URL) where login was initiated. Required
     * to populate civic_board_admin_sessions.href (VarChar(80000)).
     */
    href: string &
      tags.MinLength<1> &
      tags.MaxLength<80000> &
      tags.Format<"uri">;

    /**
     * Referrer URL (previous page URL) captured at login. Required to
     * populate civic_board_admin_sessions.referrer (VarChar(80000)). May be
     * an empty string when direct access occurs.
     */
    referrer:
      | (string &
          tags.MinLength<1> &
          tags.MaxLength<80000> &
          tags.Format<"uri">)
      | "";
  };
}
