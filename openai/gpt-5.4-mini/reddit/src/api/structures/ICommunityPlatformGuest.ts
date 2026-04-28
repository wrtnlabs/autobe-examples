import { tags } from "typia";

import { IAuthorizationToken } from "./IAuthorizationToken";

export namespace ICommunityPlatformGuest {
  /**
   * Authorization payload returned after guest join or guest refresh. It identifies the current anonymous guest and provides the token pair needed to continue using public features as a guest.
   */
  export type IAuthorized = {
    /**
     * Unique identifier of the current guest principal.
     *
         * @x-autobe-database-schema-property id
         * @x-autobe-specification Direct mapping from
         *   community_platform_guests.id. This is the anonymous guest identity
         *   identifier returned alongside the issued token payload.
     */
    id: string & tags.Format<"uuid">;

    /**
     * Authorization token.
     *
         * @x-autobe-specification Authorization token comes from the session
         *   table.
     */
    token: IAuthorizationToken;
  };

  /**
   * Request body used to renew an anonymous guest authorization session. The payload is intentionally empty because the backend derives the renewed guest identity from the existing refresh context and stored session state rather than from client-provided guest fields.
   */
  export type IRefresh = {};

  /**
   * Request body for starting anonymous guest authentication. Clients send an empty object to request a temporary guest identity; the server issues or reuses the guest session and returns authorization credentials in the response.
   */
  export type IJoin = {};
}
