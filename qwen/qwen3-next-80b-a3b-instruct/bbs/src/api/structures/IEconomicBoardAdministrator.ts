import { tags } from "typia";

import { IAuthorizationToken } from "./IAuthorizationToken";

export namespace IEconomicBoardAdministrator {
  /**
   * Login request for administrators to authenticate using email and password. This payload is used to verify administrator credentials against the registered account in the system. The email must match exactly a record in economic_board_administrators, and the password must be correct for that record.
   */
  export type ILogin = {
    email: string & tags.Format<"email">;
  };

  /**
   * Request body for creating a new administrator account upon approval of an admin request. Contains the required authentication and profile details for the new administrator account. The email must be unique across the entire system. The password will be securely hashed by the backend before storage. The display_name is the public identifier visible to other users. The bio is optional and provides a brief description of the administrator.
   */
  export type IJoin = {};

  /**
   * Authentication response containing administrator identity and session tokens after successful authentication. Includes a unique user identifier and a complete JWT authorization token pair (access and refresh) to enable secure API access. This object enables authenticated session management while excluding sensitive personal data.
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
   * Request payload for refreshing an administrator's access token. This object contains no properties as the refresh token is transmitted via the secure HTTP-only cookie. The server uses the refresh token in the cookie to validate the session and issue a new access token. This empty request body pattern follows OAuth 2.0 refresh token flow where authentication credentials are communicated via secure cookies instead of request bodies.
   */
  export type IRefresh = {};
}
