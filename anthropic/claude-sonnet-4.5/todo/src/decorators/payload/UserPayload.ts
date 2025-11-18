import { tags } from "typia";

export interface UserPayload {
  /** User ID - Primary identifier for the authenticated user. */
  id: string & tags.Format<"uuid">;

  /** Session ID associated with the authenticated user session. */
  session_id: string & tags.Format<"uuid">;

  /** Discriminator for the user role type. */
  type: "user";
}
