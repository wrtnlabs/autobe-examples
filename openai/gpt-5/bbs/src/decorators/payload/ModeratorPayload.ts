// File path: src/decorators/payload/ModeratorPayload.ts
import { tags } from "typia";

/**
 * JWT payload for moderator authorization flows. id holds the top-level
 * econ_discuss_users.id.
 */
export interface ModeratorPayload {
  /** Top-level user table ID (the fundamental user identifier in the system). */
  id: string & tags.Format<"uuid">;
  /** Discriminator for the discriminated union type. */
  type: "moderator";
}
