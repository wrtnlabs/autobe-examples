import { tags } from "typia";

export interface GuestPayload {
  /** Primary identifier for the guest user. */
  id: string & tags.Format<"uuid">;

  /** Discriminator for the discriminated union type. */
  type: "guest";
}
