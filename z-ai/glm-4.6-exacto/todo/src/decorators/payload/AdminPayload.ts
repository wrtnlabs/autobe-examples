import { tags } from "typia";

/**
 * JWT payload for system admin identity. Includes admin id, session id, and
 * discriminated role.
 */
export interface AdminPayload {
  /** Primary admin ID for this actor (uuid). */
  id: string & tags.Format<"uuid">;
  /** Session ID for authentication session (uuid). */
  session_id: string & tags.Format<"uuid">;
  /** Discriminator for role-based authorization. */
  type: "admin";
}
