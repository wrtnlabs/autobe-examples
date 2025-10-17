import { IConnection, HttpError } from "@nestia/fetcher";
import { PlainFetcher } from "@nestia/fetcher/lib/PlainFetcher";
import typia, { tags } from "typia";
import { NestiaSimulator } from "@nestia/fetcher/lib/NestiaSimulator";

import { IRedditLikePost } from "../../../../../structures/IRedditLikePost";

/**
 * Create a new post in a specific community in the reddit_like_posts table.
 *
 * Create a new post within a specific community identified by the communityId
 * path parameter. This operation enables authenticated users to contribute
 * content to communities in the form of text discussions, link sharing, or
 * image posts. The creation process validates user permissions, community
 * settings, and content requirements before inserting a new record into the
 * reddit_like_posts table along with type-specific content in the corresponding
 * specialized tables based on the post type discriminator.
 *
 * This operation is available to authenticated members, moderators, and
 * administrators who have appropriate posting permissions in the target
 * community. The system validates several authorization checks before allowing
 * post creation: the requesting user must not be banned from the community
 * (checked against reddit_like_community_bans table where is_active=true), the
 * community's posting_permission setting must allow the user to post (valid
 * values: anyone_subscribed requires community subscription, approved_only
 * requires moderator approval, moderators_only restricts to moderators and
 * admins), and the selected post type must be enabled in the community through
 * the boolean flags allow_text_posts, allow_link_posts, and allow_image_posts
 * in the reddit_like_communities table.
 *
 * The request body must specify the post type discriminator with one of three
 * valid values: 'text', 'link', or 'image'. Based on this discriminator, the
 * system routes the content to the appropriate type-specific table. For text
 * posts, the system creates a record in reddit_like_post_text_content with the
 * title (3-300 characters required) and optional body text (up to 40,000
 * characters supporting markdown formatting). For link posts, the system
 * creates a record in reddit_like_post_link_content with the title and a valid
 * HTTP/HTTPS URL (up to 2,000 characters), then attempts to extract Open Graph
 * metadata including preview_title, preview_description, and preview_image_url
 * from the target webpage for rich preview generation. For image posts, the
 * system creates a record in reddit_like_post_image_content with the title,
 * image URLs for multiple resolutions (original_image_url for full resolution
 * up to 20MB, medium_image_url resized to 640px width, thumbnail_image_url at
 * 150x150 pixels), image metadata (image_width, image_height in pixels,
 * file_size in bytes, file_format from values JPEG/PNG/GIF/WebP), and optional
 * caption up to 10,000 characters supporting markdown.
 *
 * Upon successful creation, the system performs several coordinated actions:
 * assigns a unique UUID to the post in the id field, records the current
 * timestamp in both created_at and updated_at fields, sets
 * reddit_like_member_id to the authenticated user's member ID establishing
 * content ownership, associates the post with the specified community through
 * reddit_like_community_id, sets the type field to the provided discriminator
 * value, stores the title, leaves deleted_at as null indicating active status,
 * and initializes the corresponding type-specific content record. The newly
 * created post immediately appears in the community feed sorted according to
 * the selected algorithm, becomes available for voting through the
 * reddit_like_post_votes table, can receive comments through the
 * reddit_like_comments table, and participates in karma calculation for the
 * author through the reddit_like_user_karma and reddit_like_karma_history
 * tables.
 *
 * The operation enforces comprehensive validation rules aligned with
 * requirements document section 5 (Content Validation Rules). Title validation
 * ensures length between 3 and 300 characters, trims leading and trailing
 * whitespace, and rejects titles containing only whitespace. Content
 * sanitization prevents XSS attacks by escaping HTML special characters in
 * titles and using trusted HTML sanitization libraries for markdown rendering
 * in text post bodies and image captions. URL validation for link posts
 * verifies HTTP or HTTPS protocol, validates URL format using standard parsing,
 * checks URLs against malicious site databases, and rejects URLs from
 * blacklisted domains. Image validation confirms file format matches allowed
 * types (JPEG, PNG, GIF, WebP), validates file size does not exceed 20MB
 * (20,971,520 bytes), verifies image integrity by attempting to decode, scans
 * for malware signatures, and accepts images up to 10,000 pixels in width or
 * height.
 *
 * Anti-spam measures protect the platform from abuse: users are limited to 10
 * posts per hour across all communities enforced through rate limiting,
 * accounts less than 24 hours old are restricted to 5 posts per day, duplicate
 * URL detection warns users when the same link was posted in the same community
 * within the last 7 days, and the system scans post content for prohibited
 * keywords flagging matches for moderator review. When users exceed posting
 * frequency limits, the system displays the message 'You're posting too
 * frequently. Please wait before posting again.' along with the remaining wait
 * time.
 *
 * Related operations that work together with post creation include DELETE
 * /posts/{postId} for removing created posts through soft deletion, GET
 * /communities/{communityId}/posts for listing and browsing posts within a
 * community, PATCH /communities/{communityId}/posts for searching and filtering
 * posts with complex criteria, PUT /posts/{postId} for editing post content
 * within the allowed time windows (title editable within 5 minutes, body text
 * editable anytime for text posts, captions editable for image posts), GET
 * /posts/{postId} for retrieving complete post details with type-specific
 * content, POST /posts/{postId}/votes for casting upvotes or downvotes on newly
 * created posts, and POST /posts/{postId}/comments for starting discussions on
 * the post through the comment system.
 *
 * @param props.connection
 * @param props.communityId Unique identifier of the community where the post
 *   will be created
 * @param props.body Post creation data including type discriminator, title, and
 *   type-specific content fields for text, link, or image posts
 * @path /redditLike/member/communities/:communityId/posts
 * @accessor api.functional.redditLike.member.communities.posts.create
 * @autobe Generated by AutoBE - https://github.com/wrtnlabs/autobe
 */
export async function create(
  connection: IConnection,
  props: create.Props,
): Promise<create.Response> {
  return true === connection.simulate
    ? create.simulate(connection, props)
    : await PlainFetcher.fetch(
        {
          ...connection,
          headers: {
            ...connection.headers,
            "Content-Type": "application/json",
          },
        },
        {
          ...create.METADATA,
          path: create.path(props),
          status: null,
        },
        props.body,
      );
}
export namespace create {
  export type Props = {
    /** Unique identifier of the community where the post will be created */
    communityId: string & tags.Format<"uuid">;

    /**
     * Post creation data including type discriminator, title, and
     * type-specific content fields for text, link, or image posts
     */
    body: IRedditLikePost.ICreate;
  };
  export type Body = IRedditLikePost.ICreate;
  export type Response = IRedditLikePost;

  export const METADATA = {
    method: "POST",
    path: "/redditLike/member/communities/:communityId/posts",
    request: {
      type: "application/json",
      encrypted: false,
    },
    response: {
      type: "application/json",
      encrypted: false,
    },
  } as const;

  export const path = (props: Omit<Props, "body">) =>
    `/redditLike/member/communities/${encodeURIComponent(props.communityId ?? "null")}/posts`;
  export const random = (): IRedditLikePost => typia.random<IRedditLikePost>();
  export const simulate = (
    connection: IConnection,
    props: create.Props,
  ): Response => {
    const assert = NestiaSimulator.assert({
      method: METADATA.method,
      host: connection.host,
      path: create.path(props),
      contentType: "application/json",
    });
    try {
      assert.param("communityId")(() => typia.assert(props.communityId));
      assert.body(() => typia.assert(props.body));
    } catch (exp) {
      if (!typia.is<HttpError>(exp)) throw exp;
      return {
        success: false,
        status: exp.status,
        headers: exp.headers,
        data: exp.toJSON().message,
      } as any;
    }
    return random();
  };
}
