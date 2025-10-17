export namespace ITodoListLogout {
  /**
   * Logout confirmation response.
   *
   * Returned after successful logout to confirm the refresh token was revoked
   * and the session ended.
   */
  export type IResponse = {
    /**
     * Logout confirmation message.
     *
     * Confirms the user was successfully logged out and their session was
     * terminated.
     */
    message: string;
  };
}
