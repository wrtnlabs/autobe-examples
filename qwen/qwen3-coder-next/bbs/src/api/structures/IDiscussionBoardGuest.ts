import { IAuthorizationToken } from "./IAuthorizationToken";

export namespace IDiscussionBoardGuest {
  /**
   * Current session identifier for the guest session being refreshed.
   */
  export type IRefresh = {};

  /**
   * Guest session tokens and session identifier for authenticated guest access.
   */
  export type IAuthorized = {
    /**
     * Authorization token.
     *
     * @x-autobe-specification Authorization token comes from the session table.
     */
    token: IAuthorizationToken;
  };

  /**
   * Request DTO for guest session creation. Contains session identifier for tracking guest activities without requiring authentication.
   */
  export type IJoin = {};
}
