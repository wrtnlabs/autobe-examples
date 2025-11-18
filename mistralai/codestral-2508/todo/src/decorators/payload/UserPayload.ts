import { tags } from "typia";

/**
 * Represents a JWT-authenticated user's payload for controller injection. Only
 * fields guaranteed by JWT and business identity.
 */
export interface UserPayload {
  /** Top-level user table ID (UUID). */
  id: string & tags.Format<"uuid">;
  /** Session ID tied to this login context (UUID). */
  session_id: string & tags.Format<"uuid">;
  /** Role discriminator for user identity. */
  type: "user";
}
