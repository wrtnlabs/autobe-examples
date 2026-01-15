import { IAuthorizationToken } from "./IAuthorizationToken";

export namespace ITodoListMember {
  /**
   * Authentication token response containing access and refresh tokens for
   * the authenticated member. This represents the payload returned after
   * successful join, login, or refresh operations. The member's identity is
   * established through the JWT token rather than including explicit
   * member_id fields in this response, as the member's identity is derived
   * from the authentication context.
   *
   * This schema defines the response structure for member authentication
   * operations (join, login, refresh) and contains the essential
   * authentication tokens needed for subsequent protected API requests. The
   * member's identity is derived from the JWT token used in subsequent
   * requests, not explicitly included in this response body.
   *
   * This response contains two critical components:
   *
   * 1. The member's persistent identity (id) - stored as a UUID and extracted
   *    from the JWT token during subsequent API requests. This represents the
   *    member's unique identifier within the system.
   * 2. The token property which references the IAuthorizationToken schema. This
   *    contains the JWT access and refresh tokens with their expiration
   *    timestamps, enabling secure session management.
   *
   * The member's authentication state is maintained through JWT token
   * validation on the server side, with the token structure being validated
   * against the IAuthorizationToken schema definition. All authentication
   * state is stateless, with no server-side session storage required beyond
   * the refresh token validation mechanism.
   */
  export type IAuthorized = {
    /** JWT token information for authentication */
    token: IAuthorizationToken;
  };
}
