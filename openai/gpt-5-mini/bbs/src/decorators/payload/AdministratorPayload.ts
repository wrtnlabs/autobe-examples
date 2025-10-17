import { tags } from "typia";

export interface AdministratorPayload {
  /** Top-level registered user ID (UUID) */
  id: string & tags.Format<"uuid">;

  /** Discriminator for the authenticated role */
  type: "administrator";
}
