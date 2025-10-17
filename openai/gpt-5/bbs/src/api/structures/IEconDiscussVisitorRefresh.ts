export namespace IEconDiscussVisitorRefresh {
  /**
   * Visitor refresh request.
   *
   * Consumes an existing refresh token to obtain a renewed authorization
   * session. No database writes are required for the happy path; role and
   * account state checks are performed against Actors tables.
   */
  export type IRequest = {
    /**
     * Refresh token previously issued to the client. Used to rotate and
     * mint a new access token.
     *
     * Implementation validates signature/claims and confirms Visitor role
     * remains present via Actors.econ_discuss_visitors.
     */
    refresh_token: string;
  };
}
