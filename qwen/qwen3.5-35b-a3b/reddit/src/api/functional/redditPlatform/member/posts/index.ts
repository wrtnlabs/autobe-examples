import {
  HttpError,
  IConnection,
  NestiaSimulator,
  PlainFetcher,
} from "@nestia/fetcher";
import typia, { tags } from "typia";

import { IPageIRedditPlatformPost } from "../../../../structures/IPageIRedditPlatformPost";
import { IRedditPlatformPost } from "../../../../structures/IRedditPlatformPost";
import { IRedditPlatformPostVote } from "../../../../structures/IRedditPlatformPostVote";

export * as _vote from "./_vote/index";
export * as metrics from "./metrics/index";
export * as comments from "./comments/index";

/**
 * Create a new post in the platform with type-specific content.
 *
 * ## Overview
 *
 * This operation allows authenticated members to create posts in any community. The post must specify one of three types (text, link, or image) and provide the corresponding content.
 *
 * ## Requirements
 *
 * - Authentication is required (member actor)
 * - Title must be provided
 * - Content type must match the specified post_type
 * - Community must exist and be accessible
 *
 * ## Content Validation
 *
 * - **Text posts**: Require text_content field with the post body
 * - **Link posts**: Require url field with a valid web address
 * - **Image posts**: Require image_url field with an image URL and optional image_alt_text for accessibility
 *
 * ## Response
 *
 * Returns the complete post entity with all fields, including initialized counts (upvotes, downvotes, comments all set to 0).
 *
 * ## Authorization
 *
 * Only authenticated members can create posts. The post author is recorded and retains exclusive editing and deletion rights.
 *
 * ## Error Handling
 *
 * - 400: Validation errors (missing title, invalid post_type, missing required content)
 * - 401: Not authenticated
 * - 403: Insufficient permissions
 * - 404: Community not found
 * - 409: Community has been banned or suspended
 *
 * @param props.connection
 * @param props.body Post creation data including community association, title, content type, and type-specific content. The content fields required depend on post_type.
 *
 *             ## Request Body Fields
 *
 *             - community_id (string, uuid): The community to post in
 *             - title (string): Post title, required, non-empty
 *             - post_type (string): Must be one of 'text', 'link', 'image'
 *             - text_content (string): Required when post_type is 'text'
 *             - url (string): Required when post_type is 'link'
 *             - image_url (string): Required when post_type is 'image'
 *             - image_alt_text (string, optional): Accessibility text for image posts
 * @x-autobe-authorization-type null
 * @x-autobe-authorization-actor member
 * @x-autobe-specification Create a new post with the following implementation steps:
 *
 * 1. **Authentication Check**: Verify the requesting user is an authenticated member. Return 401 if not authenticated.
 *
 * 2. **Input Validation**: Validate the request body:
 *    - title: Required, non-empty string
 *    - post_type: Must be one of 'text', 'link', 'image'
 *    - content validation based on post_type:
 *      - 'text': text_content is required
 *      - 'link': url is required
 *      - 'image': image_url is required, image_alt_text is optional
 *
 * 3. **Community Verification**: Query reddit_platform_communities to verify the community_id exists. Check that community.deleted_at is null (community not soft-deleted). Return 404 if community not found or deleted.
 *
 * 4. **Create Post Record**: Insert into reddit_platform_posts with:
 *    - id: Generate UUID
 *    - community_id: From request
 *    - author_id: From authenticated user
 *    - title: From request
 *    - post_type: From request
 *    - upvotes_count: 0
 *    - downvotes_count: 0
 *    - comment_count: 0
 *    - created_at: Current timestamp (timestamptz)
 *    - updated_at: Current timestamp (timestamptz)
 *    - deleted_at: null
 *
 * 5. **Create Content Record**: Based on post_type, insert into corresponding table:
 *    - 'text': Insert into reddit_platform_post_texts with text_content
 *    - 'link': Insert into reddit_platform_post_links with url
 *    - 'image': Insert into reddit_platform_post_images with image_url and image_alt_text (if provided)
 *    Use the created post.id as reddit_platform_post_id with CASCADE delete relation.
 *
 * 6. **Return Result**: Query and return the complete post entity with all fields joined with the content table. Return HTTP 201 Created status.
 *
 * 7. **Error Handling**:
 *    - 400: Return validation error with field-level details
 *    - 401: Return authentication required message
 *    - 403: Return permission denied message
 *    - 404: Return not found for community
 *    - 409: Return conflict if community is banned
 *    - 500: Return generic error for unexpected failures
 *
 * 8. **Transaction**: Wrap post creation and content creation in a database transaction to ensure consistency.
 * @path /redditPlatform/member/posts
 * @accessor api.functional.redditPlatform.member.posts.create
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
          path: create.path(),
          status: null,
        },
        props.body,
      );
}
export namespace create {
  export type Props = {
    /**
     * Post creation data including community association, title, content type, and type-specific content. The content fields required depend on post_type.
     *
     * ## Request Body Fields
     *
     * - community_id (string, uuid): The community to post in
     * - title (string): Post title, required, non-empty
     * - post_type (string): Must be one of 'text', 'link', 'image'
     * - text_content (string): Required when post_type is 'text'
     * - url (string): Required when post_type is 'link'
     * - image_url (string): Required when post_type is 'image'
     * - image_alt_text (string, optional): Accessibility text for image posts
     */
    body: IRedditPlatformPost.ICreate;
  };
  export type Body = IRedditPlatformPost.ICreate;
  export type Response = IRedditPlatformPost;

  export const METADATA = {
    method: "POST",
    path: "/redditPlatform/member/posts",
    request: {
      type: "application/json",
      encrypted: false,
    },
    response: {
      type: "application/json",
      encrypted: false,
    },
  } as const;

  export const path = () => "/redditPlatform/member/posts";
  export const random = (): IRedditPlatformPost =>
    typia.random<IRedditPlatformPost>();
  export const simulate = (
    connection: IConnection,
    props: create.Props,
  ): Response => {
    const assert = NestiaSimulator.assert({
      method: METADATA.method,
      host: connection.host,
      path: create.path(),
      contentType: "application/json",
    });
    try {
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

/**
 * Search and list posts with pagination, filtering, and sorting options.
 *
 * ### Overview
 *
 * Returns a paginated list of posts from the platform with support for multiple sorting algorithms and filtering by community, author, post type, and date ranges.
 *
 * ### Sorting Options
 *
 * **Hot**: Ranks posts by recent activity and engagement score, prioritizing posts with high vote activity in the recent time window.
 *
 * **New**: Displays posts in reverse chronological order by creation date.
 *
 * **Top**: Ranks posts by highest vote score. Requires a time range filter (today, week, month, year, all) to limit the scoring period.
 *
 * **Controversial**: Ranks posts that have received many votes but have scores near zero, indicating polarized opinions.
 *
 * ### Filtering Options
 *
 * Filter posts by community, author, post type, date ranges, and text search on title.
 *
 * ### Response Fields
 *
 * Each post summary includes: id, title, post_type, author username, community name, vote scores (upvotes, downvotes, net score), comment count, and creation timestamp.
 *
 * @param props.connection
 * @param props.body Search criteria including pagination, sorting options, time range filter, and optional filters for community, author, post type, and title search.
 * @x-autobe-authorization-type null
 * @x-autobe-authorization-actor member
 * @x-autobe-specification Query reddit_platform_posts table with JOINs to reddit_platform_members for author username and reddit_platform_communities for community name.
 *
 * Apply search filters:
 * - community_id filter: match specific community
 * - author_id filter: match specific author
 * - post_type filter: match text, link, or image type
 * - title_search: case-insensitive search on title field
 * - date_range filters: created_at between startDate and endDate
 *
 * Apply sorting:
 * - hot: Calculate engagement score based on recent votes and comments within last 24 hours
 * - new: Order by created_at DESC
 * - top: Order by score DESC, apply time range filter if specified
 * - controversial: Order by ABS(score) DESC, filter where score is near zero
 *
 * Pagination:
 * - Calculate offset as (page - 1) * limit
 * - Return total count for pagination metadata
 * - Order results consistently for stable pagination
 *
 * Return post summaries with author.username and community.name included. Include upvotes_count, downvotes_count, and score from post record. Include comment_count for engagement metrics.
 * @path /redditPlatform/member/posts
 * @accessor api.functional.redditPlatform.member.posts.index
 * @autobe Generated by AutoBE - https://github.com/wrtnlabs/autobe
 */
export async function index(
  connection: IConnection,
  props: index.Props,
): Promise<index.Response> {
  return true === connection.simulate
    ? index.simulate(connection, props)
    : await PlainFetcher.fetch(
        {
          ...connection,
          headers: {
            ...connection.headers,
            "Content-Type": "application/json",
          },
        },
        {
          ...index.METADATA,
          path: index.path(),
          status: null,
        },
        props.body,
      );
}
export namespace index {
  export type Props = {
    /**
     * Search criteria including pagination, sorting options, time range filter, and optional filters for community, author, post type, and title search.
     */
    body: IRedditPlatformPost.IRequest;
  };
  export type Body = IRedditPlatformPost.IRequest;
  export type Response = IPageIRedditPlatformPost.ISummary;

  export const METADATA = {
    method: "PATCH",
    path: "/redditPlatform/member/posts",
    request: {
      type: "application/json",
      encrypted: false,
    },
    response: {
      type: "application/json",
      encrypted: false,
    },
  } as const;

  export const path = () => "/redditPlatform/member/posts";
  export const random = (): IPageIRedditPlatformPost.ISummary =>
    typia.random<IPageIRedditPlatformPost.ISummary>();
  export const simulate = (
    connection: IConnection,
    props: index.Props,
  ): Response => {
    const assert = NestiaSimulator.assert({
      method: METADATA.method,
      host: connection.host,
      path: index.path(),
      contentType: "application/json",
    });
    try {
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

/**
 * Retrieve a single post by its unique identifier, including all associated content, author information, and community details.
 *
 * This endpoint returns the complete post entity with:
 * - Post metadata: title, type, creation/update timestamps
 * - Content: full text content, image URL, or link URL depending on post type
 * - Author: username and karma score from the member table
 * - Community: name of the community where the post was published
 * - Engagement metrics: vote scores (upvotes, downvotes, calculated score), comment count
 * - Visibility status: whether the post has been soft-deleted
 *
 * Guest users and authenticated members can both access this endpoint to view public post content. Posts are filtered by soft-deletion status to hide deleted content from public views.
 *
 * @param props.connection
 * @param props.postId Unique identifier of the post to retrieve
 * @x-autobe-authorization-type null
 * @x-autobe-authorization-actor member
 * @x-autobe-specification Query the reddit_platform_posts table by UUID to find the post.
 *
 * Follow these implementation steps:
 * 1. Validate the postId is a valid UUID format
 * 2. Execute database query: SELECT * FROM reddit_platform_posts WHERE id = :postId
 * 3. LEFT JOIN with reddit_platform_communities to get community name
 * 4. LEFT JOIN with reddit_platform_members to get author username and karma
 * 5. LEFT JOIN with reddit_platform_post_texts OR reddit_platform_post_images OR reddit_platform_post_links based on post_type to get content-specific data
 * 6. Calculate score = upvotes_count - downvotes_count
 * 7. If deleted_at is not null, return 404 Not Found (soft-deleted posts are hidden)
 * 8. Return 404 if post does not exist
 *
 * Response includes:
 * - id, title, post_type, upvotes_count, downvotes_count, score, comment_count
 * - created_at, updated_at
 * - author: { username, karma }
 * - community: { name }
 * - content: depends on post_type
 *   - text: { text_content }
 *   - image: { image_url, image_alt_text }
 *   - link: { url }
 *
 * Handle soft-deleted posts by checking deleted_at field - return 404 when post has been deleted by author or moderator.
 * @path /redditPlatform/member/posts/:postId
 * @accessor api.functional.redditPlatform.member.posts.at
 * @autobe Generated by AutoBE - https://github.com/wrtnlabs/autobe
 */
export async function at(
  connection: IConnection,
  props: at.Props,
): Promise<at.Response> {
  return true === connection.simulate
    ? at.simulate(connection, props)
    : await PlainFetcher.fetch(
        {
          ...connection,
          headers: {
            ...connection.headers,
            "Content-Type": "application/json",
          },
        },
        {
          ...at.METADATA,
          path: at.path(props),
          status: null,
        },
      );
}
export namespace at {
  export type Props = {
    /**
     * Unique identifier of the post to retrieve
     */
    postId: string & tags.Format<"uuid">;
  };
  export type Response = IRedditPlatformPost;

  export const METADATA = {
    method: "GET",
    path: "/redditPlatform/member/posts/:postId",
    request: null,
    response: {
      type: "application/json",
      encrypted: false,
    },
  } as const;

  export const path = (props: Props) =>
    `/redditPlatform/member/posts/${encodeURIComponent(props.postId ?? "null")}`;
  export const random = (): IRedditPlatformPost =>
    typia.random<IRedditPlatformPost>();
  export const simulate = (
    connection: IConnection,
    props: at.Props,
  ): Response => {
    const assert = NestiaSimulator.assert({
      method: METADATA.method,
      host: connection.host,
      path: at.path(props),
      contentType: "application/json",
    });
    try {
      assert.param("postId")(() => typia.assert(props.postId));
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

/**
 * Update an existing post's title and content.
 *
 * Users can only edit posts they authored. The system verifies post ownership before applying updates. Modifiable fields include the post title and the post content (text, link URL, or image URL depending on post type). The updated_at timestamp is automatically refreshed.
 *
 * This operation requires authentication and the requesting user must be the post's author. Posts that have been soft-deleted cannot be edited. Moderators have additional privileges in their communities but post editing remains an author-exclusive operation.
 *
 * @param props.connection
 * @param props.postId UUID of the post to update.
 * @param props.body Partial update fields for the post. Only provide fields that need to be changed. Title can be any non-empty string up to 200 characters. Content fields depend on post_type: text_content for text posts, url for link posts, image_url and optional image_alt_text for image posts.
 * @x-autobe-authorization-type null
 * @x-autobe-authorization-actor member
 * @x-autobe-specification 1. Validate that postId is a valid UUID
 * 2. Verify the post exists and is not soft-deleted (deleted_at is null)
 * 3. Check authentication - user must be logged in
 * 4. Verify ownership: the authenticated user's ID must match the post's author_id
 * 5. Validate request body fields:
 *    - title: if provided, must be non-empty string, max 200 characters
 *    - text_content: if post_type is 'text' and provided, required string, max 10000 characters
 *    - url: if post_type is 'link' and provided, must be valid HTTP/HTTPS URI, max 2048 characters
 *    - image_url: if post_type is 'image' and provided, must be valid HTTP/HTTPS URI, max 2048 characters
 *    - image_alt_text: optional string, max 255 characters
 * 6. If content fields are provided, update the corresponding child table record:
 *    - Text posts: update reddit_platform_post_texts.text_content
 *    - Link posts: update reddit_platform_post_links.url and create/update image_alt_text in reddit_platform_post_images if post_type changes to 'image'
 *    - Image posts: update reddit_platform_post_images.image_url and image_alt_text
 * 7. If post_type changed, ensure the appropriate child table record exists and update all related records
 * 8. Update the post's title field
 * 9. Set updated_at to current timestamp
 * 10. Return the full updated post with all fields
 *
 * Error handling:
 * - 404: Post not found or already deleted
 * - 401: Not authenticated
 * - 403: User is not the post author
 * - 400: Invalid request body (missing required fields, validation errors)
 * - 409: Post type change conflicts with existing child records
 * @path /redditPlatform/member/posts/:postId
 * @accessor api.functional.redditPlatform.member.posts.update
 * @autobe Generated by AutoBE - https://github.com/wrtnlabs/autobe
 */
export async function update(
  connection: IConnection,
  props: update.Props,
): Promise<update.Response> {
  return true === connection.simulate
    ? update.simulate(connection, props)
    : await PlainFetcher.fetch(
        {
          ...connection,
          headers: {
            ...connection.headers,
            "Content-Type": "application/json",
          },
        },
        {
          ...update.METADATA,
          path: update.path(props),
          status: null,
        },
        props.body,
      );
}
export namespace update {
  export type Props = {
    /**
     * UUID of the post to update.
     */
    postId: string & tags.Format<"uuid">;

    /**
     * Partial update fields for the post. Only provide fields that need to be changed. Title can be any non-empty string up to 200 characters. Content fields depend on post_type: text_content for text posts, url for link posts, image_url and optional image_alt_text for image posts.
     */
    body: IRedditPlatformPost.IUpdate;
  };
  export type Body = IRedditPlatformPost.IUpdate;
  export type Response = IRedditPlatformPost;

  export const METADATA = {
    method: "PUT",
    path: "/redditPlatform/member/posts/:postId",
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
    `/redditPlatform/member/posts/${encodeURIComponent(props.postId ?? "null")}`;
  export const random = (): IRedditPlatformPost =>
    typia.random<IRedditPlatformPost>();
  export const simulate = (
    connection: IConnection,
    props: update.Props,
  ): Response => {
    const assert = NestiaSimulator.assert({
      method: METADATA.method,
      host: connection.host,
      path: update.path(props),
      contentType: "application/json",
    });
    try {
      assert.param("postId")(() => typia.assert(props.postId));
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

/**
 * Permanently deletes a post and all its associated comments from the platform.
 *
 * **Authorization**
 *
 * - Only the post author can delete their own posts
 * - Community moderators can delete any post within their community
 * - Other users cannot delete posts they did not create
 *
 * **Deletion Behavior**
 *
 * - Deletion is permanent and cannot be undone
 * - All comments on the deleted post are also deleted (cascade)
 * - The post is immediately removed from all community feeds and search results
 * - Post authors are not notified when moderators delete their posts
 *
 * **Error Handling**
 *
 * - 403 Forbidden if the requesting user is not the post author or a community moderator
 * - 404 Not Found if the post does not exist
 * - 404 Not Found if the post has already been deleted
 *
 * **Post-Modification Effects**
 *
 * - Vote counts and comment counts are updated to reflect removal
 * - The post no longer appears in community feeds, user profiles, or search results
 * - Post karma metrics remain unchanged (deletion does not affect karma score)
 *
 * @param props.connection
 * @param props.postId UUID of the post to delete.
 * @x-autobe-authorization-type null
 * @x-autobe-authorization-actor member
 * @x-autobe-specification 1. Validate postId UUID format and extract from path parameter
 * 2. Query reddit_platform_posts table for post with id = postId
 * 3. If post not found OR deleted_at is not null: return 404 Not Found
 * 4. Verify authorization:
 *    - Get requesting user ID from authentication context
 *    - Check if user_id == post.author_id (post author)
 *    - OR: verify user has moderator role in post.community_id (moderator)
 *    - If neither: return 403 Forbidden
 * 5. Delete post record from reddit_platform_posts (hard delete, not soft delete)
 * 6. Due to CASCADE on reddit_platform_comments.author FK: all comments are automatically deleted
 * 7. Due to CASCADE on reddit_platform_post_votes.reddit_platform_post_id FK: all votes are automatically deleted
 * 8. Due to CASCADE on reddit_platform_post_snapshots.reddit_platform_post_id FK: all snapshots are automatically deleted
 * 9. Return 204 No Content
 * @path /redditPlatform/member/posts/:postId
 * @accessor api.functional.redditPlatform.member.posts.erase
 * @autobe Generated by AutoBE - https://github.com/wrtnlabs/autobe
 */
export async function erase(
  connection: IConnection,
  props: erase.Props,
): Promise<void> {
  return true === connection.simulate
    ? erase.simulate(connection, props)
    : await PlainFetcher.fetch(
        {
          ...connection,
          headers: {
            ...connection.headers,
            "Content-Type": "application/json",
          },
        },
        {
          ...erase.METADATA,
          path: erase.path(props),
          status: null,
        },
      );
}
export namespace erase {
  export type Props = {
    /**
     * UUID of the post to delete.
     */
    postId: string & tags.Format<"uuid">;
  };

  export const METADATA = {
    method: "DELETE",
    path: "/redditPlatform/member/posts/:postId",
    request: null,
    response: {
      type: "application/json",
      encrypted: false,
    },
  } as const;

  export const path = (props: Props) =>
    `/redditPlatform/member/posts/${encodeURIComponent(props.postId ?? "null")}`;
  export const random = (): void => typia.random<void>();
  export const simulate = (
    connection: IConnection,
    props: erase.Props,
  ): void => {
    const assert = NestiaSimulator.assert({
      method: METADATA.method,
      host: connection.host,
      path: erase.path(props),
      contentType: "application/json",
    });
    try {
      assert.param("postId")(() => typia.assert(props.postId));
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

/**
 * Cast an upvote or downvote on a post to express your opinion and contribute to its vote score.
 *
 * ### Authentication Required
 * This operation requires member authentication. Only authenticated users can vote on posts.
 *
 * ### Vote Behavior
 * - Upvoting adds 1 to the post's vote score
 * - Downvoting subtracts 1 from the post's vote score
 * - You can cast only one vote per post
 * - If you have already voted, you can change your vote or remove it
 * - Your karma score will increase or decrease based on votes on your content
 *
 * ### Restrictions
 * - You cannot vote on your own posts
 * - You cannot vote on deleted or inaccessible posts
 * - Attempting to vote with the same direction you already cast will be rejected
 *
 * @param props.connection
 * @param props.postId The unique identifier of the post to vote on.
 * @param props.body Vote direction to cast on the post.
 * @x-autobe-authorization-type null
 * @x-autobe-authorization-actor member
 * @x-autobe-specification Create a vote record in reddit_platform_post_votes table.
 *
 * ### Implementation Steps:
 * 1. Verify user is authenticated (member actor)
 * 2. Look up post by postId from reddit_platform_posts
 * 3. Validate post exists and is accessible (not deleted)
 * 4. Verify post author is NOT the voting user (cannot vote on own content)
 * 5. Check if user already has a vote on this post via composite unique constraint (reddit_platform_member_id, reddit_platform_post_id)
 * 6. If vote exists:
 *    - If new vote_type matches existing vote_type, reject with 409 Conflict
 *    - If new vote_type is null, delete existing vote record
 *    - Otherwise, update existing vote with new vote_type and updated_at timestamp
 * 7. If vote does not exist, create new vote record with:
 *    - id: auto-generated UUID
 *    - reddit_platform_member_id: current user's ID
 *    - reddit_platform_post_id: postId from path parameter
 *    - vote_type: from request body ('up' or 'down')
 *    - created_at: current timestamp
 *    - updated_at: current timestamp
 * 8. Recalculate post vote score by counting upvotes and downvotes from all votes for this post
 * 9. Return the vote record with 201 Created status (or 200 OK if vote changed)
 * @path /redditPlatform/member/posts/:postId/vote
 * @accessor api.functional.redditPlatform.member.posts.vote
 * @autobe Generated by AutoBE - https://github.com/wrtnlabs/autobe
 */
export async function vote(
  connection: IConnection,
  props: vote.Props,
): Promise<vote.Response> {
  return true === connection.simulate
    ? vote.simulate(connection, props)
    : await PlainFetcher.fetch(
        {
          ...connection,
          headers: {
            ...connection.headers,
            "Content-Type": "application/json",
          },
        },
        {
          ...vote.METADATA,
          path: vote.path(props),
          status: null,
        },
        props.body,
      );
}
export namespace vote {
  export type Props = {
    /**
     * The unique identifier of the post to vote on.
     */
    postId: string & tags.Format<"uuid">;

    /**
     * Vote direction to cast on the post.
     */
    body: IRedditPlatformPostVote.ICreate;
  };
  export type Body = IRedditPlatformPostVote.ICreate;
  export type Response = IRedditPlatformPostVote;

  export const METADATA = {
    method: "POST",
    path: "/redditPlatform/member/posts/:postId/vote",
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
    `/redditPlatform/member/posts/${encodeURIComponent(props.postId ?? "null")}/vote`;
  export const random = (): IRedditPlatformPostVote =>
    typia.random<IRedditPlatformPostVote>();
  export const simulate = (
    connection: IConnection,
    props: vote.Props,
  ): Response => {
    const assert = NestiaSimulator.assert({
      method: METADATA.method,
      host: connection.host,
      path: vote.path(props),
      contentType: "application/json",
    });
    try {
      assert.param("postId")(() => typia.assert(props.postId));
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

/**
 * Retrieve detailed engagement statistics for a specific post.
 *
 * This endpoint returns comprehensive metrics about a post's performance and engagement within the community. Statistics include vote distribution breakdowns, comment engagement patterns, and temporal activity data.
 *
 * The statistics are calculated from vote records and comment data, providing real-time insights into how the community is interacting with the content. This data is useful for analytics dashboards, moderator reviews, and understanding content performance.
 *
 * @param props.connection
 * @param props.postId Unique identifier of the post to retrieve statistics for.
 * @x-autobe-authorization-type null
 * @x-autobe-authorization-actor member
 * @x-autobe-specification Retrieve detailed engagement statistics for the specified post by postId.
 *
 * 1. Validate that the post exists and is not soft-deleted (deleted_at is null).
 * 2. Query vote records from reddit_platform_post_votes for the post to calculate:
 *    - Total upvotes and downvotes from vote_type records
 *    - Unique voter count (distinct member count)
 *    - Vote ratio (upvotes / total votes)
 * 3. Query comment records from reddit_platform_comments for the post to calculate:
 *    - Total comment count (matching comment_count field in posts table)
 *    - Root comment count (where parent is null)
 *    - Reply comment count (where parent is not null)
 *    - Top comment by vote score
 * 4. Calculate engagement metrics:
 *    - Votes per comment ratio (total votes / comment count)
 *    - Comment density (comment count relative to post age)
 *    - Engagement velocity (recent activity rate if available)
 * 5. Query recent activity from last 24 hours and last 7 days.
 * 6. Join with community and author metadata for context.
 * 7. Return statistics object with all metrics.
 *
 * Edge cases:
 * - Post has no votes: return zero counts
 * - Post has no comments: return comment counts of 0
 * - Post is deleted: return 404
 * - Post does not exist: return 404
 * @path /redditPlatform/member/posts/:postId/statistics
 * @accessor api.functional.redditPlatform.member.posts.statistics
 * @autobe Generated by AutoBE - https://github.com/wrtnlabs/autobe
 */
export async function statistics(
  connection: IConnection,
  props: statistics.Props,
): Promise<statistics.Response> {
  return true === connection.simulate
    ? statistics.simulate(connection, props)
    : await PlainFetcher.fetch(
        {
          ...connection,
          headers: {
            ...connection.headers,
            "Content-Type": "application/json",
          },
        },
        {
          ...statistics.METADATA,
          path: statistics.path(props),
          status: null,
        },
      );
}
export namespace statistics {
  export type Props = {
    /**
     * Unique identifier of the post to retrieve statistics for.
     */
    postId: string & tags.Format<"uuid">;
  };
  export type Response = IRedditPlatformPost.IStatistic;

  export const METADATA = {
    method: "GET",
    path: "/redditPlatform/member/posts/:postId/statistics",
    request: null,
    response: {
      type: "application/json",
      encrypted: false,
    },
  } as const;

  export const path = (props: Props) =>
    `/redditPlatform/member/posts/${encodeURIComponent(props.postId ?? "null")}/statistics`;
  export const random = (): IRedditPlatformPost.IStatistic =>
    typia.random<IRedditPlatformPost.IStatistic>();
  export const simulate = (
    connection: IConnection,
    props: statistics.Props,
  ): Response => {
    const assert = NestiaSimulator.assert({
      method: METADATA.method,
      host: connection.host,
      path: statistics.path(props),
      contentType: "application/json",
    });
    try {
      assert.param("postId")(() => typia.assert(props.postId));
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
