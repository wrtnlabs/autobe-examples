import { tags } from "typia";

export interface AdminPayload {
  /** Administrator user ID. */
  id: string & tags.Format<"uuid">;

  /** Discriminator for the discriminated union type. */
  type: "admin";
}
