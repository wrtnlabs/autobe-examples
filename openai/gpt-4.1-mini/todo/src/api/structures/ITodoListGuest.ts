import { tags } from "typia";

import { IAuthorizationToken } from "./IAuthorizationToken";

export namespace ITodoListGuest {
  /**
   * Data required to create a new guest user account in the todo_list_guests
   * table.
   *
   * This DTO is used for guest registration where only a unique nickname is
   * needed.
   *
   * The creation request must include a unique nickname string.
   *
   * No password or email is required as guests are unauthenticated users with
   * minimal data.
   *
   * The created record will have a generated UUID as id and timestamps
   * handled by the system.
   *
   * This type maps directly to the todo_list_guests Prisma model.
   */
  export type ICreate = {
    /**
     * Guest user's display nickname or pseudonym. Must be unique and is
     * required for registration.
     */
    nickname: string;
  };

  /**
   * Authorization response containing guest user information and JWT tokens.
   *
   * This response is returned upon successful guest registration or token
   * refresh.
   *
   * It includes the guest's unique ID, nickname, and token details.
   *
   * This type maps directly to the todo_list_guests Prisma model combined
   * with authentication token data.
   */
  export type IAuthorized = {
    /** Unique identifier of the authenticated guest user. */
    id: string & tags.Format<"uuid">;

    /** The unique nickname of the authenticated guest user. */
    nickname: string;

    /** JWT token information for authentication */
    token: IAuthorizationToken;

    /** Timestamp when the guest record was created. */
    created_at: string & tags.Format<"date-time">;

    /** Timestamp when the guest record was last updated. */
    updated_at: string & tags.Format<"date-time">;
  };

  /**
   * Refresh token request containing the refresh token.
   *
   * This object is used to request new authorization tokens by providing a
   * valid refresh token associated with a guest user session. It enables
   * seamless continuation of guest user sessions without requiring re-login.
   *
   * @title ITodoListGuest.IRefresh
   */
  export type IRefresh = {
    /**
     * Refresh token string used to obtain new JWT tokens for continued
     * guest authentication.
     */
    refresh_token: string;
  };
}
