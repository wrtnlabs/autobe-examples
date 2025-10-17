import { tags } from "typia";

/**
 * Represents the payload for a user authentication.
 *
 * This interface defines the structure of the authenticated user data that will
 * be injected into Controller methods when using the UserAuth decorator. It
 * includes the user's ID and type, which are used for authorization purposes.
 *
 * @property id - The unique identifier of the user, formatted as a UUID.
 * @property type - The type of the user, which is always "user" for this
 *   payload.
 */
export interface UserPayload {
  /** The unique identifier of the user, formatted as a UUID. */
  id: string & tags.Format<"uuid">;

  /** The type of the user, which is always "user" for this payload. */
  type: "user";
}
