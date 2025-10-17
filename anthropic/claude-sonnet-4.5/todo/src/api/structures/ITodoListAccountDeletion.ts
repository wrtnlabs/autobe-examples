export namespace ITodoListAccountDeletion {
  /**
   * Account deletion confirmation response.
   *
   * Returned after successful account deletion to confirm the operation and
   * inform the user of the deletion schedule.
   */
  export type IResponse = {
    /**
     * Account deletion confirmation.
     *
     * Confirms the account was successfully marked for deletion and will be
     * permanently removed after the grace period.
     */
    message: string;
  };
}
