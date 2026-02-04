import { tags } from "typia";

export interface SuperadministratorPayload {
  /**
   * Top-level user table ID (the fundamental user identifier in the system).
   */
  id: string & tags.Format<"uuid">;

  /**
   * Session ID associated with the super administrator user.
   */
  session_id: string & tags.Format<"uuid">;

  /**
   * Discriminator for the discriminated union type.
   */
  type: "superAdministrator";
}
