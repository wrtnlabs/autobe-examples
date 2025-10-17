import { tags } from "typia";

import { IAuthorizationToken } from "./IAuthorizationToken";

export namespace ITodoAppAdministrator {
  /**
   * Authorization response for administrator login with JWT token and
   * privilege information.
   *
   * Returned upon successful administrator authentication. Includes
   * admin_level to identify scope of administrative access.
   */
  export type IAuthorized = {
    /** Unique identifier of the authenticated administrator. */
    id: string & tags.Format<"uuid">;

    /** Email address of the authenticated administrator. */
    email: string & tags.Format<"email">;

    /** Administrator privilege level indicating scope of system access. */
    admin_level: number &
      tags.Type<"int32"> &
      tags.Minimum<1> &
      tags.Maximum<5>;

    /** JWT token information for authentication */
    token: IAuthorizationToken;

    /** Token type indicator for authorization header. */
    token_type: "Bearer";

    /** Access token expiration time in seconds. */
    expires_in: number & tags.Type<"int32"> & tags.Minimum<0>;
  };
}
