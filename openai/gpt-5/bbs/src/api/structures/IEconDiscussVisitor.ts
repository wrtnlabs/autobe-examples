import { tags } from "typia";

import { IAuthorizationToken } from "./IAuthorizationToken";

export namespace IEconDiscussVisitor {
  /**
   * Authorization response for a newly registered or refreshed Visitor
   * session.
   *
   * Contains the principal id (econ_discuss_users.id) and the issued JWT
   * token material. Sensitive account fields (password_hash, mfa_secret,
   * mfa_recovery_codes) are never returned.
   *
   * Role context: Visitor privileges are represented by a row in
   * Actors.econ_discuss_visitors linked to the same user_id.
   */
  export type IAuthorized = {
    /**
     * Unique identifier of the authenticated user.
     *
     * Maps to Actors.econ_discuss_users.id (UUID primary key).
     */
    id: string & tags.Format<"uuid">;

    /** JWT token information for authentication */
    token: IAuthorizationToken;
  };
}
