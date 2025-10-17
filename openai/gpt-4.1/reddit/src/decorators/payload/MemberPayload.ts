import { tags } from "typia";

/**
 * Payload injected for an authenticated member.
 *
 * @property id The top-level member's UUID (primary identifier).
 * @property type The discriminator for member role type ("member").
 */
export interface MemberPayload {
  /** Top-level member UUID (the fundamental user identifier). */
  id: string & tags.Format<"uuid">;

  /** Role discriminator: always "member". */
  type: "member";
}
