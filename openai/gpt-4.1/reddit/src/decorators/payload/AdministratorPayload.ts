import { tags } from "typia";

/** JWT Payload for authenticated administrator actor. */
export interface AdministratorPayload {
  /** Top-level user table ID associated with the administrator account */
  id: string & tags.Format<"uuid">;

  /** Session ID associated with the admin actor */
  session_id: string & tags.Format<"uuid">;

  /** Discriminator for the administrator role */
  type: "administrator";
}
