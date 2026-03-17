import { tags } from "typia";

export namespace IRedditClonePostLink {
  /**
   * Request body for creating link content in a LINK type post. Contains the external URL that the post links to.
   */
  export type ICreate = {
    /**
     * External URL that the link post references.
     *
     * @x-autobe-database-schema-property url
     * @x-autobe-specification Direct mapping from reddit_clone_post_links.url (VARCHAR(80000)). Validated as URI format. Required field.
     */
    url: string & tags.Format<"uri">;
  };
}
