import { tags } from "typia";

export namespace IUser {
  /**
   * A lightweight summary of a citizen user, presented in administrative audit logs to identify the target of actions like banning or promotion. Contains essential identifying and engagement information without exposing sensitive personal data like email or account status details. This schema allows administrators to see who was affected by an action without revealing private or security-sensitive information, while still providing context such as user activity history through article and comment counts.
   */
  export type ISummary = {
    /**
     * @x-autobe-database-schema-property id
     */
    id: string & tags.Format<"uuid">;

    /**
     * Public-facing name of the user. May be null if not provided.
     *
     * @x-autobe-database-schema-property display_name
     * @x-autobe-specification Maps to database column `display_name`, which is nullable. Defaults to null if user has not set a display name.
     */
    display_name?: string | null | undefined;
    /**
     * @x-autobe-database-schema-property created_at
     */
    created_at: string;
    /**
     * @x-autobe-database-schema-property updated_at
     */
    updated_at: string;
    article_count: number & tags.Type<"int32">;
    comment_count: number & tags.Type<"int32">;
  };
}
