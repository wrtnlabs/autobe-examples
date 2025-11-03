import { tags } from "typia";

import { IAuthorizationToken } from "./IAuthorizationToken";

export namespace IShoppingMallGuest {
  /**
   * Schema for creating a new guest account with required IP address and
   * creation timestamp.
   */
  export type ICreate = {
    /** IP address of the guest user. */
    ip: string;

    /** Timestamp of the guest session creation. */
    created_at: string & tags.Format<"date-time">;
  };

  /**
   * Authorization information including temporary JWT tokens issued to the
   * guest user.
   */
  export type IAuthorized = {
    /** Unique identifier of the authenticated guest user. */
    id: string & tags.Format<"uuid">;

    /** JWT token information for authentication */
    token: IAuthorizationToken;

    /** Expiration datetime of the access token. */
    expires_at: string & tags.Format<"date-time">;
  };

  /**
   * Request body schema for refreshing temporary JWT tokens for a guest user
   * using a valid refresh token. This operation requires only the refresh
   * token string issued during the guest join process.
   */
  export type IRefresh = {
    /**
     * Refresh token string issued during the guest join operation to renew
     * the temporary JWT authorization tokens.
     */
    refresh_token: string;
  };
}
