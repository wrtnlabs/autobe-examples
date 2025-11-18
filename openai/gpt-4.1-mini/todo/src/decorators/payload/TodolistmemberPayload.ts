import { tags } from "typia";

export interface TodolistmemberPayload {
  /** Top-level user table ID, representing the authenticated member */
  id: string & tags.Format<"uuid">;

  /** Session ID associated with the authenticated member */
  session_id: string & tags.Format<"uuid">;

  /** Discriminator for the discriminated union type */
  type: "todolistmember";
}
