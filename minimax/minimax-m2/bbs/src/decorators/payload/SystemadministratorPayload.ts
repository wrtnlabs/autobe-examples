import { tags } from "typia";

export interface SystemadministratorPayload {
  /** Top-level user table ID (the fundamental user identifier in the system). */
  id: string & tags.Format<"uuid">;

  /** Session ID associated with the system administrator user. */
  session_id: string & tags.Format<"uuid">;

  /** Discriminator for the discriminated union type. */
  type: "systemAdministrator";
}
