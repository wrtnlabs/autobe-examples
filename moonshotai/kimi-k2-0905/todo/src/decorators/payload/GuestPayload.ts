import { tags } from "typia";

export interface GuestPayload {
  /** Guest session identifier (the fundamental guest identifier in the system). */
  id: string & tags.Format<"uuid">;

  /** Discriminator for the discriminated union type. */
  type: "guest";
}
