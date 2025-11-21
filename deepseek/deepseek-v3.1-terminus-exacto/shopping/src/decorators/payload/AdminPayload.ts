import { tags } from "typia";

export interface AdminPayload {
  /**
   * Top-level administrator table ID (the fundamental administrator identifier
   * in the system).
   */
  id: string & tags.Format<"uuid">;

  /** Session ID associated with the administrator. */
  session_id: string & tags.Format<"uuid">;

  /** Discriminator for the discriminated union type. */
  type: "admin";
}
