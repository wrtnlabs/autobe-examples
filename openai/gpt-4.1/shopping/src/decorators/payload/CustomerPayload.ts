import { tags } from "typia";

/** Authenticated payload injected for Customer role. */
export interface CustomerPayload {
  /** Top-level customer ID (UUID). */
  id: string & tags.Format<"uuid">;
  /** Session ID associated with this login. */
  session_id: string & tags.Format<"uuid">;
  /** Discriminator specifying actor type. */
  type: "customer";
}
