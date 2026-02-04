import { tags } from "typia";

export interface AdministratorPayload {
  /**
   * Top-level administrator table ID (the fundamental user identifier in the system).
   */
  id: string & tags.Format<"uuid">;

  /**
   * Session ID associated with the administrator user.
   */
  session_id: string & tags.Format<"uuid">;

  /**
   * Discriminator for the discriminated union type.
   */
  type: "administrator";
}
