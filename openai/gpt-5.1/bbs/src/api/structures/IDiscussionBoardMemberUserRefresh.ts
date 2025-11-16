export namespace IDiscussionBoardMemberUserRefresh {
  /**
   * Request payload for refreshing JWT tokens for a discussionBoard member
   * user.
   *
   * This DTO carries the refresh token that the client previously received
   * during login or join flows and now presents in order to obtain new access
   * and refresh tokens, without resubmitting credentials.
   *
   * The payload is intentionally minimal: all identity and lifecycle checks
   * are derived from the token and the underlying
   * `discussion_board_memberusers` and restriction models, so no user
   * identifiers or profile fields appear here.
   */
  export type IRequest = {
    /**
     * Refresh token issued previously to the member user, represented as an
     * opaque string.
     *
     * The server validates its integrity, expiry, and association with a
     * `discussion_board_memberusers` record before issuing new tokens.
     */
    refresh_token: string;
  };
}
