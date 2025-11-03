import { tags } from "typia";

import { ICivicBoardUser } from "./ICivicBoardUser";

export namespace ICivicBoardUserSession {
  /**
   * Summary of a user session used for audit context. Includes the owning
   * user as a summary object and connection metadata with timestamps. The raw
   * foreign key civic_board_user_id is not exposed; instead, the BELONGS-TO
   * relation is transformed into user: ICivicBoardUser.ISummary for complete
   * context and consistency with admin session summaries.
   */
  export type ISummary = {
    /** Primary key of the user session (UUID). */
    id: string & tags.Format<"uuid">;

    /**
     * Owner member transformed from
     * civic_board_user_sessions.civic_board_user_id as a summary reference.
     * Replaces the raw FK and aligns with the BELONGS-TO d�3e .ISummary
     * rule.
     */
    user: ICivicBoardUser.ISummary;

    /** IP address observed at session creation. */
    ip: string;

    /** Full connection URL captured at session creation. */
    href: string & tags.Format<"uri">;

    /** Referrer URL captured at session creation. */
    referrer: string & tags.Format<"uri">;

    /** Session creation timestamp (UTC). */
    created_at: string & tags.Format<"date-time">;

    /** Session expiration/end time (UTC). Null when active. */
    expired_at?: (string & tags.Format<"date-time">) | null | undefined;
  };

  /**
   * Refresh request payload to renew access credentials for an existing
   * authenticated member session. The server validates that the associated
   * civic_board_user_sessions entry is active (expired_at is NULL) and that
   * the linked civic_board_users record is still eligible (not suspended, not
   * deleted). Session context fields (ip, href, referrer) are NOT included
   * here because refresh reuses the existing session.
   */
  export type IRequest = {
    /**
     * Opaque refresh artifact issued at login that maps to an active
     * civic_board_user_sessions row. Used to request new access credentials
     * while session remains valid.
     */
    refresh_token: string & tags.MinLength<1>;
  };
}
