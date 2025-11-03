import { tags } from "typia";

export namespace ICivicBoardAdminJoin {
  /**
   * Admin self-registration (join) request body. On success, a new row is
   * created in civic_board_admins (email, password_hash via secure hashing of
   * provided password, display_name, email_verified=false, suspended=false,
   * timestamps) and an authenticated session is recorded in
   * civic_board_admin_sessions (civic_board_admin_id, ip, href, referrer,
   * created_at). This DTO intentionally excludes system-managed fields and
   * uses plain password per security guidance. Session context fields follow
   * the Session Table Pattern: href and referrer are required for self-join;
   * ip is optional and may be derived server-side.
   */
  export type ICreate = {
    /**
     * Administrator login and contact email. Will populate
     * civic_board_admins.email (unique).
     */
    email: string &
      tags.MinLength<3> &
      tags.MaxLength<320> &
      tags.Format<"email">;

    /**
     * Plain-text password for registration; the backend hashes it and
     * stores into civic_board_admins.password_hash. Clients must NEVER send
     * pre-hashed values.
     */
    password: string & tags.MinLength<8> & tags.MaxLength<2000>;

    /**
     * Public-facing administrator display name
     * (civic_board_admins.display_name). Shown in audit trails and
     * moderation records.
     */
    display_name: string & tags.MinLength<1> & tags.MaxLength<120>;

    /**
     * Client IP address observed at session establishment. Optional because
     * servers can derive it; recorded in civic_board_admin_sessions.ip when
     * provided.
     */
    ip?:
      | (string & tags.Format<"ipv4">)
      | (string & tags.Format<"ipv6">)
      | null
      | undefined;

    /**
     * Connection URL at the moment of registration; used for session
     * context and audit. Recorded in civic_board_admin_sessions.href.
     */
    href: string &
      tags.MinLength<1> &
      tags.MaxLength<80000> &
      tags.Format<"uri">;

    /**
     * Referrer URL captured at session creation; may be an empty string for
     * direct access. Recorded in civic_board_admin_sessions.referrer.
     */
    referrer:
      | (string &
          tags.MinLength<1> &
          tags.MaxLength<80000> &
          tags.Format<"uri">)
      | "";
  };
}
