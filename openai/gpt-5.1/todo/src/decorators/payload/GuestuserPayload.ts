import { tags } from "typia";

/** JWT payload for unauthenticated guest users. */
export interface GuestuserPayload {
  /** Top-level guest concept identifier. */
  id: string & tags.Format<"uuid">;

  /** Session identifier associated with this guest interaction. */
  session_id: string & tags.Format<"uuid">;

  /** Discriminator used by authorization logic to distinguish guest actors. */
  type: "guestUser";
}
