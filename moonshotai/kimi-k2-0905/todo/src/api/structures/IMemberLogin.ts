import { tags } from "typia";

export namespace IMemberLogin {
  /**
   * Member login request containing authentication credentials.
   *
   * Provides the necessary authentication information for member users to
   * access their personal todo management functionality.
   */
  export type IRequest = {
    /** Member email address for authentication */
    email: string & tags.Format<"email">;

    /** Member plain text password for authentication verification */
    password: string;
  };
}
