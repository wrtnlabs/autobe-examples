import { tags } from "typia";

export interface GuestuserPayload {
  /**
   * User identifier. For anonymous users, this is "anonymous". For
   * authenticated guest users, this contains the actual user ID.
   */
  id: (string & tags.Format<"uuid">) | "anonymous";

  /**
   * Session ID associated with the guest user. For anonymous users, this is a
   * randomly generated temporary ID. For authenticated guest users, this is the
   * actual session ID.
   */
  session_id: string & tags.Format<"uuid">;

  /** Discriminator for the discriminated union type. */
  type: "guestuser";
}
