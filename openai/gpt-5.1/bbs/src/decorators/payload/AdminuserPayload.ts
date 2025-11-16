import { tags } from "typia";

/**
 * JWT payload for an authenticated admin user.
 *
 * This represents the top-level user identifier for administrators in the
 * discussion board domain.
 */
export interface AdminuserPayload {
  /**
   * Top-level administrator user ID.
   *
   * References `discussion_board_adminusers.id`.
   */
  id: string & tags.Format<"uuid">;

  /**
   * Session ID associated with this authenticated admin user.
   *
   * References `discussion_board_adminuser_sessions.id`.
   */
  session_id: string & tags.Format<"uuid">;

  /** Discriminator for admin user role. */
  type: "adminuser";

  /** Email of the administrator at the time the token was issued. */
  email: string & tags.Format<"email">;

  /** Display name shown for this administrator. */
  display_name: string;

  /**
   * Indicates whether the administrator had a verified email at the time the
   * token was issued.
   */
  email_verified: boolean;

  /**
   * Lifecycle state snapshot for this admin account when the token was created
   * (e.g., "active", "suspended").
   */
  account_status: string;

  /** Timestamp when the token (or underlying session) was created. */
  created_at: string & tags.Format<"date-time">;

  /**
   * Timestamp when the token (or underlying session) was last refreshed or
   * updated.
   */
  updated_at: string & tags.Format<"date-time">;
}
