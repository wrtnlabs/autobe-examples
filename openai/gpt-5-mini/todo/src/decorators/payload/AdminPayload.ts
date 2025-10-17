import { tags } from "typia";

export interface AdminPayload {
  /** Top-level admin table ID (the fundamental admin identifier in the system). */
  id: string & tags.Format<"uuid">;

  /** Discriminator for the discriminated union type. */
  type: "admin";
}
