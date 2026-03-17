import { tags } from "typia";

export namespace IRedditLikePostImage {
  /**
   * Request body for creating a new image gallery entry that links an uploaded attachment file to a post with display ordering for gallery arrangement.
   */
  export type ICreate = {
    /**
     * UUID of the attachment file to link to this post image gallery entry.
     *
     * @x-autobe-database-schema-property reddit_like_attachment_id
     * @x-autobe-specification Direct mapping from reddit_like_post_images.reddit_like_attachment_id. UUID referencing the uploaded attachment file to link to this post.
     */
    attachmentId: string;

    /**
     * Display sequence order within the post's image gallery. Lower values appear first in the gallery arrangement.
     *
     * @x-autobe-database-schema-property display_order
     * @x-autobe-specification Direct mapping from reddit_like_post_images.display_order. Integer controlling the display sequence within the post's image gallery. Lower values appear first.
     */
    displayOrder: number & tags.Type<"int32"> & tags.Minimum<0>;
  };
}
