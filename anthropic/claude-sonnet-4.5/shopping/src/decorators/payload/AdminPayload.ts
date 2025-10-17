import { tags } from "typia";

export interface AdminPayload {
  /** Admin's unique identifier. */
  id: string & tags.Format<"uuid">;

  /** Discriminator for the discriminated union type. */
  type: "admin";
}
