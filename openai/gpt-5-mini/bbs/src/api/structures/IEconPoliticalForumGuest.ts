import { tags } from "typia";

import { IAuthorizationToken } from "./IAuthorizationToken";

export namespace IEconPoliticalForumGuest {
  /**
   * Request body to create a temporary guest identity.
   *
   * This DTO maps to the `econ_political_forum_guest` Prisma model. Clients
   * MAY provide an optional `nickname` and/or `user_agent`. Do NOT supply
   * system-managed fields (id, created_at, updated_at, deleted_at).
   */
  export type ICreate = {
    /**
     * Optional short display nickname for the guest. Maps to
     * econ_political_forum_guest.nickname. The server should trim
     * whitespace and enforce a UI-friendly max length.
     */
    nickname?: string | undefined;

    /**
     * Optional user-agent string captured at creation time. Maps to
     * econ_political_forum_guest.user_agent. If not supplied, the server
     * may capture this from request headers.
     */
    user_agent?: string | undefined;
  };

  /**
   * Authorization response returned after successful guest creation or
   * refresh.
   *
   * Includes the guest id and an authorization token payload (access +
   * refresh tokens). When returned after refresh, the `id` references the
   * existing guest record and servers SHOULD verify the guest record is not
   * deleted.
   */
  export type IAuthorized = {
    /**
     * Unique identifier of the created guest record
     * (econ_political_forum_guest.id).
     */
    id: string & tags.Format<"uuid">;

    /**
     * Optional nickname previously supplied or null if none was provided.
     * Mirrors econ_political_forum_guest.nickname.
     */
    nickname?: string | null | undefined;

    /** JWT token information for authentication */
    token: IAuthorizationToken;
  };

  /**
   * Guest token refresh request.
   *
   * This request object contains the single required property used to refresh
   * an ephemeral guest session. It is intentionally minimal because guest
   * identities are lightweight in the database (econ_political_forum_guest)
   * and token lifecycle/rotation is handled by the authentication service
   * rather than persisted on the guest record.
   */
  export type IRefresh = {
    /**
     * Opaque guest refresh token previously issued by POST
     * /auth/guest/join.
     *
     * This token is sent by the client to obtain a new short-lived access
     * token and a rotated refresh token. The server validates the token
     * against its token store (or stateless revocation strategy) and MAY
     * check that the referenced guest identity still exists and is not
     * soft-deleted (econ_political_forum_guest.deleted_at). Clients MUST
     * supply the token exactly as received; do not include additional
     * authentication fields in this payload.
     */
    refresh_token: string;
  };
}
