import { tags } from "typia";

/**
 * Payload type injected to controller methods for authenticated admin actors
 * via AdminAuth.
 *
 * @property id - Top-level admin (system user) id (UUID)
 * @property session_id - ID of the current admin session (UUID)
 * @property type - Actor role discriminator (always "admin")
 */
export interface AdminPayload {
  /** Top-level admin user ID (primary key) */
  id: string & tags.Format<"uuid">;
  /** Session ID associated with the admin authentication event. */
  session_id: string & tags.Format<"uuid">;
  /** Discriminator for the role type (admin) */
  type: "admin";
}
