import { tags } from "typia";

import { ICivicBoardAdmin } from "./ICivicBoardAdmin";

export namespace ICivicBoardAdminSession {
  /**
   * Summary view of an administrator session from civic_board_admin_sessions
   * for embedding as provenance in moderation action responses. Belongs-to
   * admin reference is included as .ISummary to prevent circular expansion.
   */
  export type ISummary = {
    /**
     * Primary key of the administrator session (UUID). Maps to
     * civic_board_admin_sessions.id.
     */
    id: string & tags.Format<"uuid">;

    /**
     * Administrator who owns this session. Transformed association of
     * civic_board_admin_sessions.civic_board_admin_id.
     */
    admin: ICivicBoardAdmin.ISummary;

    /**
     * IP address observed when the administrator session was established.
     * Maps to civic_board_admin_sessions.ip.
     */
    ip: string;

    /**
     * Connection URL that initiated the admin session. Maps to
     * civic_board_admin_sessions.href.
     */
    href: string & tags.Format<"uri">;

    /**
     * Referrer URL captured at session creation. May be an empty string for
     * direct access. Maps to civic_board_admin_sessions.referrer.
     */
    referrer: (string & tags.Format<"uri">) | "";

    /**
     * Session creation time (UTC). Maps to
     * civic_board_admin_sessions.created_at.
     */
    created_at: string & tags.Format<"date-time">;

    /**
     * Session expiration/end time (UTC), when applicable. Maps to
     * civic_board_admin_sessions.expired_at.
     */
    expired_at?: (string & tags.Format<"date-time">) | null | undefined;
  };
}
