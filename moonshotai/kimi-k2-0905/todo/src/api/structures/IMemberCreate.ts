import { tags } from "typia";

export namespace IMemberCreate {
  /**
   * Member registration request data for creating new user accounts.
   *
   * Provides the essential information required for member account creation
   * while validating password security requirements for secure
   * authentication.
   */
  export type IRequest = {
    /** Member email address for account creation and authentication */
    email: string & tags.Format<"email">;

    /**
     * Member password for authentication (minimum 8 characters with
     * complexity requirements)
     */
    password: string & tags.MinLength<8>;
  };
}
