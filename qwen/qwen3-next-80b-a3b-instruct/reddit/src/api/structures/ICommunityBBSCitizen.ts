import { tags } from "typia";

import { IAuthorizationToken } from "./IAuthorizationToken";

export namespace ICommunityBBSCitizen {
  /**
   * Returns secure authentication tokens and citizen identity details upon
   * successful registration or login. This DTO represents the authentication
   * response following a successful join or login operation on the
   * communityBBS system. The id field contains the citizen's unique system
   * identifier, and the token field contains the JWT authentication tokens
   * that enable ongoing authenticated sessions. The citizen's profile
   * information is not included in this response for security reasons; only
   * the necessary authentication data is provided. This response is used by
   * clients to establish and maintain authenticated sessions without exposing
   * sensitive account details.
   */
  export type IAuthorized = {
    /**
     * Unique identifier of the authenticated citizen account. This ID is
     * derived from the community_bbs_citizen table and is used as the
     * citizen's system identifier in all future authenticated requests.
     * Corresponds to the 'id' field in the Prisma model
     * community_bbs_citizen.
     */
    id: string;

    /** JWT token information for authentication */
    token: IAuthorizationToken;
  };

  /**
   * Lightweight summary representation of a communityBBS citizen for use in
   * reports and references.
   *
   * This schema provides minimal identification and public profile
   * information for a citizen (registered user) without exposing sensitive
   * authentication or personal data. It is designed for use in report
   * references and other contexts where knowing the identity is necessary but
   * detailed profile data is not needed.
   *
   * Used in the 'reporter' field of ICommunityBBSReport.IInvert when the
   * reporter is a citizen. Also used in various other contexts where citizen
   * identification is needed but full details would be excessive.
   */
  export type ISummary = {
    /**
     * Unique identifier for the citizen, corresponding to the 'id' field in
     * the community_bbs_citizen table.
     */
    id: string & tags.Format<"uuid">;

    /**
     * Public-facing username displayed in UI elements. This is the name
     * others see when interacting with the citizen's content.
     *
     * This field is unique across the system and follows platform-specific
     * naming rules (no special characters, limited length).
     */
    username: string;

    /**
     * Optional display name that may differ from username. Used in
     * notifications and UI. Null if not set.
     */
    nickname?: null | string | undefined;
  };
}
