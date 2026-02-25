import { tags } from "typia";

export namespace IPrincipal {
  /**
   * Lightweight user reference containing essential identification information for displaying user ownership.
   */
  export type ISummary = {
    /**
     * Unique identifier for the user account.
     *
     * @x-autobe-database-schema-property id
     * @x-autobe-specification Direct mapping from users.id. Unique identifier for the user.
     */
    id: string & tags.Format<"uuid">;

    /**
     * User's display name for presentation in UI.
     *
     * @x-autobe-specification Computed from users.profile->>'displayName'. Extracts displayName from JSON profile column.
     */
    displayName: string;
  };
}
