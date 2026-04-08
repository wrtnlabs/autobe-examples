import { tags } from "typia";

import { IAuthorizationToken } from "./IAuthorizationToken";

export namespace ITodoAppGuest {
  /**
   * Guest refresh token request.
   *
   * This request body contains the guest refresh token used to renew an existing guest authorization session without creating a new guest identity.
   *
   * Submit the token exactly as issued by the authentication service. The server uses it to verify the current guest session and return renewed authorization tokens.
   */
  export type IRefresh = {
    /**
     * Guest refresh credential.
     *
     * This token is the existing guest refresh credential required to renew guest access when the current authorization is expiring or has expired.
     *
     * @x-autobe-specification Read the refresh token from the request body and pass it to the guest refresh validation flow for POST /todoApp/auth/guest/refresh. The token is verified against the guest authorization/session store and is not persisted on todo_app_guests.
     */
    refreshToken: string & tags.Format<"password">;
  };

  /**
   * Authorized guest identity and token payload.
   *
   * This object is returned after a successful guest join or refresh operation. It contains the guest's public identifier together with the authorization token set required to continue using the private todo application as a guest.
   *
   * The token payload is shared with other authorization responses so guest authentication stays consistent with the broader auth contract.
   */
  export type IAuthorized = {
    /**
     * The guest's public identifier.
     *
     * This value identifies the anonymous guest account created for the current authentication session. It is returned alongside the token payload so clients can retain a stable guest identity for subsequent guest-authenticated requests.
     *
     * @x-autobe-specification Return the public guest identifier generated or selected by the guest authentication flow. This value comes from the auth service response context and is not read from a direct database column in this DTO.
     */
    id: string & tags.Format<"uuid">;

    /**
     * Authorization token.
     *
     * @x-autobe-specification Authorization token comes from the session table.
     */
    token: IAuthorizationToken;
  };

  /**
   * Request body for guest sign-in.
   *
   * This schema carries only transient client context needed to start the anonymous guest authorization flow in the private todo application. It captures the current page, the referrer, and optionally an IPv4 address when the request is produced by a server-assisted flow.
   *
   * It is not a persisted guest record and does not include identifiers, lifecycle fields, credentials, or tokens.
   */
  export type IJoin = {
    /**
     * Current page URI used to start the guest authorization flow.
     *
     * This identifies the page where the anonymous visitor initiated guest sign-in. It is transient onboarding context and is not stored in the guest record.
     *
     * @x-autobe-specification Transient current page URI supplied during guest onboarding. Use this request context when creating a guest identity; do not persist it to todo_app_guests.
     */
    href: string & tags.Format<"uri">;

    /**
     * Referring page URI used to start the guest authorization flow.
     *
     * This identifies the page that sent the visitor into guest sign-in. It is transient onboarding context and is not stored in the guest record.
     *
     * @x-autobe-specification Transient referrer URI supplied during guest onboarding. Use this request context when creating a guest identity; do not persist it to todo_app_guests.
     */
    referrer: string & tags.Format<"uri">;

    /**
     * Optional IPv4 address for a server-assisted guest authorization request.
     *
     * This value is transient onboarding context and may be supplied when the request is produced by SSR or another server-assisted flow. It is not stored in the guest record.
     *
     * @x-autobe-specification Optional transient IPv4 address accepted for server-assisted guest onboarding flows such as SSR. Use this request context when creating a guest identity; do not persist it to todo_app_guests.
     */
    ip?: (string & tags.Format<"ipv4">) | undefined;
  };
}
