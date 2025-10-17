import { tags } from "typia";

/**
 * Authenticated Moderator JWT Payload
 *
 * - Id: Top-level member UUID.
 * - Type: Role discriminator ("moderator").
 */
export interface ModeratorPayload {
  /** Top-level member table ID (the fundamental user identifier in the system). */
  id: string & tags.Format<"uuid">;

  /** Discriminator for the discriminated union type. */
  type: "moderator";
}
