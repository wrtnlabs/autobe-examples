import { tags } from "typia";

/**
 * JWT payload structure injected into controller methods by UserAuth decorator.
 * Contains top-level user id, session id, and type discriminator.
 */
export interface UserPayload {
  /** Top-level user id (todo_list_users.id). */
  id: string & tags.Format<"uuid">;

  /** Session id referenced by the JWT and authentication. */
  session_id: string & tags.Format<"uuid">;

  /** Discriminator for the role type (always "user" for this payload). */
  type: "user";
}
