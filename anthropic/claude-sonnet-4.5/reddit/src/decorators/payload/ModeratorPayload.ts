import { tags } from "typia";

export interface ModeratorPayload {
  /** Moderator user ID (the fundamental moderator identifier in the system). */
  id: string & tags.Format<"uuid">;

  /** Discriminator for the discriminated union type. */
  type: "moderator";
}
