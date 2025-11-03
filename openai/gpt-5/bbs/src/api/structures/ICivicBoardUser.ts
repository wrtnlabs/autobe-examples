import { tags } from "typia";

import { IAuthorizationToken } from "./IAuthorizationToken";

export namespace ICivicBoardUser {
  /**
   * Self-signup payload for creating a new member account backed by
   * civic_board_users. Security note: Do not include system fields such as
   * id, created_at, or status flags; they are system-managed. Authentication
   * context fields (ids) are forbidden in request bodies. Session context
   * fields (ip, href, referrer) are included to create an initial
   * civic_board_user_sessions record at join time. Column references:
   * civic_board_users.email, civic_board_users.password_hash (derived from
   * password), civic_board_users.display_name; session columns
   * civic_board_user_sessions.ip/href/referrer are populated by the server.
   */
  export type ICreate = {
    /**
     * Login and contact email for the member. Maps to
     * civic_board_users.email (unique).
     */
    email: string & tags.Format<"email">;

    /**
     * Plain-text password provided by the client. Server hashes this value
     * into civic_board_users.password_hash; the hashed value is never
     * accepted from clients.
     */
    password: string;

    /**
     * Public display name shown on authored content. Maps to
     * civic_board_users.display_name.
     */
    display_name: string & tags.MinLength<1> & tags.MaxLength<120>;

    /**
     * Optional client IP address captured for session context. Used to
     * create civic_board_user_sessions.ip during self-signup. Accepts IPv4
     * or IPv6 when provided; null permitted. When omitted, the server may
     * derive it from the request origin.
     */
    ip?:
      | (string & tags.Format<"ipv4">)
      | (string & tags.Format<"ipv6">)
      | null
      | undefined;

    /**
     * Connection URL (current page URL) captured for session context. Used
     * to create civic_board_user_sessions.href during self-signup.
     */
    href: string &
      tags.MinLength<1> &
      tags.MaxLength<80000> &
      tags.Format<"uri">;

    /**
     * Referrer URL captured for session context. Used to create
     * civic_board_user_sessions.referrer during self-signup. May be an
     * empty string when the user arrives directly (no referrer).
     */
    referrer:
      | (string &
          tags.MinLength<1> &
          tags.MaxLength<80000> &
          tags.Format<"uri">)
      | "";
  };

  /**
   * Authorized response for member authentication operations
   * (join/login/refresh). Provides the member id, an authorization token
   * bundle, and optionally a compact member snapshot. No password or secret
   * values are ever exposed.
   */
  export type IAuthorized = {
    /** Unique identifier of the authenticated member (civic_board_users.id). */
    id: string & tags.Format<"uuid">;

    /** JWT token information for authentication */
    token: IAuthorizationToken;

    /**
     * Authenticated member snapshot for client convenience. Excludes
     * sensitive fields such as password_hash.
     */
    user?: ICivicBoardUser.ISummary | undefined;
  };

  /**
   * User summary derived from Prisma model civic_board_users. Optimized for
   * embedding and admin-safe reads. It includes identification (id), display
   * name, status indicators (email_verified, suspended), and created_at for
   * sorting/administration while explicitly excluding sensitive fields such
   * as email and password_hash.
   */
  export type ISummary = {
    /** Unique identifier of the user (UUID). Maps to civic_board_users.id. */
    id: string & tags.Format<"uuid">;

    /**
     * Public display name shown on authored content. Maps to
     * civic_board_users.display_name.
     */
    display_name: string;

    /**
     * Whether the member’s email has been verified. Non-nullable in Prisma
     * and safe to expose for context. Maps to
     * civic_board_users.email_verified.
     */
    email_verified: boolean;

    /**
     * Whether the account is currently suspended (restricted from
     * creating/modifying content). Non-nullable in Prisma and safe to
     * expose for context. Maps to civic_board_users.suspended.
     */
    suspended: boolean;

    /**
     * Account creation timestamp (UTC). Useful for admin sorting and
     * auditing context. Maps to civic_board_users.created_at.
     */
    created_at: string & tags.Format<"date-time">;
  };
}
