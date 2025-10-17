import { tags } from "typia";

import { IAuthorizationToken } from "./IAuthorizationToken";

export namespace IDiscussionBoardGuest {
  /** Guest registration information to create a new guest session. */
  export type ICreate = {
    /** Unique session token to identify guest user session. */
    session_token: string;
  };

  /** Authorized guest session information including temporary JWT tokens. */
  export type IAuthorized = {
    /** Unique identifier of the guest session. */
    id: string & tags.Format<"uuid">;

    /** JWT token information for authentication */
    token: IAuthorizationToken;
  };

  /**
   * Schema for guest refresh token request to renew authorization tokens
   * securely.
   */
  export type IRefresh = {
    /** Refresh token string for guest session authorization renewal */
    refresh_token: string;

    /** Type of the token, must be 'guest_refresh' */
    token_type: "guest_refresh";

    /** Token version, integer ≥ 1 */
    version: number & tags.Type<"int32"> & tags.Minimum<1>;

    /** Cryptographic signature of the refresh token */
    signature: string;

    /** Fingerprint to identify the client device or session */
    fingerprint: string;

    /** Expiry time of the refresh token in ISO 8601 format */
    expire: string & tags.Format<"date-time">;

    /** Issued time of the refresh token in ISO 8601 format */
    issued_at: string & tags.Format<"date-time">;
  };
}
