import { tags } from "typia";

/**
 * Authenticated payload structure for a regular user.
 *
 * - Id: top-level user UUID
 * - Session_id: session UUID for active login session
 * - Type: constant "user" discriminator
 */
export interface UserPayload {
  /** Unique identifier for the user (Primary Key, UUID). */
  id: string & tags.Format<"uuid">;
  /** Session ID for the authenticated session (UUID). */
  session_id: string & tags.Format<"uuid">;
  /** Type discriminator for union narrowing. */
  type: "user";
}
