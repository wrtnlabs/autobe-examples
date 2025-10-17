// File path: src/decorators/payload/ModeratorPayload.ts
import { tags } from "typia";

export interface ModeratorPayload {
  /**
   * Top-level registered user ID (the fundamental user identifier in the
   * system).
   */
  id: string & tags.Format<"uuid">;

  /** Discriminator for the discriminated union type. */
  type: "moderator";
}
