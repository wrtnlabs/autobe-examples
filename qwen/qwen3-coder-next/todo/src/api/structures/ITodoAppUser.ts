import { tags } from "typia";

export namespace ITodoAppUser {
  /**
   * Summary view of a user with essential identification information for display purposes.
   */
  export type ISummary = {
    /**
     * Unique identifier for the user account.
     *
     * @x-autobe-database-schema-property id
     * @x-autobe-specification Direct mapping from todo_app_users.id.
     */
    id: string & tags.Format<"uuid">;

    /**
     * User's email address for identification.
     *
     * @x-autobe-database-schema-property email
     * @x-autobe-specification Direct mapping from todo_app_users.email.
     */
    email: string;
  };
}
