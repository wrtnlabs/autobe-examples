import {
  HttpError,
  IConnection,
  NestiaSimulator,
  PlainFetcher,
} from "@nestia/fetcher";
import typia, { tags } from "typia";

import { ICommunityPlatformPost } from "../../../../structures/ICommunityPlatformPost";
import { IPageICommunityPlatformPost } from "../../../../structures/IPageICommunityPlatformPost";

export * as images from "./images/index";
export * as link from "./link/index";
export * as snapshots from "./snapshots/index";
export * as votes from "./votes/index";

/**
 * Retrieve detailed information for a single post.
 *
 * This endpoint is the single-post view required by the platform: it returns the post title and the post’s full content appropriate to the post_type, along with the post’s author, the community the post belongs to, and interaction metadata including vote score and comment count. It also supports the time-since posted presentation (for example, “3 hours ago”) derived from the post’s posted_at timestamp.
 *
 * For correct media/content rendering, the operation must select the content representation based on community_platform_posts.post_type:
 * - For text posts, return the text body (community_platform_posts.body).
 * - For link posts, return the canonical link URL stored in community_platform_posts.link_url or the associated link metadata in community_platform_post_links.
 * - For image posts, return the image representation using community_platform_posts.image_cover_url and/or the attachment rows in community_platform_post_images (e.g., the cover image and/or the first relevant image for fallback rendering).
 *
 * A critical visibility rule applies: when the target post is marked as deleted via community_platform_posts.deleted_at, the system must not expose the deleted post’s content or author/community details, and the response should behave as if the post is not available for viewing.
 *
 * Security and access boundaries follow the actor model: guests and members can view community feeds and single posts, but state-changing actions (editing/deleting/voting/reporting) are outside the scope of this read operation. Any sensitive fields should be omitted unless the post is available for viewing.
 *
 * Implementation should aggregate vote score and comment count using community_platform_post_votes and community_platform_comments, respectively, and must align with the interaction display requirements: vote score is the net result of member votes, and comment count excludes comments that should not contribute to the visible discussion.
 *
 * Related operations:
 * - Feed list operations provide summarized items (title, author username, community name, vote score, comment count, and type-specific content previews).
 * - Edit and delete operations update or remove a post; those changes must be reflected in this single-post view.
 *
 *
 * @param props.connection
 * @param props.postId Target post ID to retrieve details for.
 * @x-autobe-authorization-type null
 * @x-autobe-authorization-actor admin
 * @x-autobe-specification 1) Validate inputs - Parse postId from path as UUID
 *   (use repository/service layer UUID parsing).
 *
 * 2) Load post core row
 * - Query community_platform_posts by id = postId.
 * - If community_platform_posts.deleted_at is not null, treat as not found/unauthorized-for-viewing: return an error response consistent with the platform’s error conventions for unavailable posts (do not return author/community/content fields).
 *
 * 3) Load author and community
 * - Join community_platform_posts.author_id -> community_platform_members (author) and community_platform_members.userProfile (via community_platform_user_profiles when needed) to obtain author username/display fields required by ICommunityPlatformPost.
 * - Join community_platform_posts.community_id -> community_platform_communities to obtain community name (and any other required display fields).
 *
 * 4) Compute vote score
 * - Aggregate community_platform_post_votes for the post_id and only include rows that are not deleted (community_platform_post_votes.deleted_at is null).
 * - Compute net score from vote_value as defined by the domain (sum of vote_value; if vote_value encodes direction, net sum yields score).
 *
 * 5) Compute comment count
 * - Count community_platform_comments for the post (community_platform_post_id = postId) that are not deleted (community_platform_comments.deleted_at is null).
 * - Note: If the platform uses soft deletion, exclude deleted comments from count so that deleted content no longer contributes.
 *
 * 6) Resolve content representation by post_type
 * - Read community_platform_posts.post_type:
 *   a) text: return community_platform_posts.body.
 *   b) link: return community_platform_posts.link_url (prefer scalar on posts; fall back to community_platform_post_links href/display fields if required by DTO mapping).
 *   c) image: return community_platform_posts.image_cover_url and/or resolve attachment info from community_platform_post_images where deleted_at is null; ensure at least one image URL is available for rendering.
 *
 * 7) Compute time-since
 * - Use community_platform_posts.posted_at to compute a time-since string in the service layer (or let DTO formatter compute from posted_at, depending on existing patterns). Ensure response matches the requirement example format.
 *
 * 8) Response mapping
 * - Map all loaded/derived fields into the response DTO (single post detail).
 *
 * 9) Error handling
 * - If post does not exist or is deleted, return the platform’s “not found/unavailable” error without leaking content or author/community fields.
 *
 * @path /communityPlatform/admin/posts/:postId
 * @accessor api.functional.communityPlatform.admin.posts.at
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
     * Target post ID to retrieve details for.
     */
    postId: string & tags.Format<"uuid">;
  };
  export type Response = ICommunityPlatformPost;

  export const METADATA = {
    method: "GET",
    path: "/communityPlatform/admin/posts/:postId",
    request: null,
    response: {
      type: "application/json",
      encrypted: false,
    },
  } as const;

  export const path = (props: Props) =>
    `/communityPlatform/admin/posts/${encodeURIComponent(props.postId ?? "null")}`;
  export const random = (): ICommunityPlatformPost =>
    typia.random<ICommunityPlatformPost>();
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
 * Update an existing community post’s core content and media/link representation.
 *
 * This operation targets the single post identified by the path parameter {postId} and updates the post’s author-attributed core fields stored in `community_platform_posts`. The underlying data model includes the post’s `title`, `body`, `post_type`, and type-specific scalar fields such as `link_url`, `image_cover_url`, and `image_alt_text`, along with edit tracking via `edited_by_id` and `edited_at`.
 *
 * Security and permissions: only an authenticated member who is the author of the target post is allowed to perform this update. If the authenticated member is not the post author, the system must deny the request. The post remains attributed to the same author after editing, meaning the author identity is not replaced during an update.
 *
 * Validation rules: the request must provide a valid non-empty title. The operation must enforce valid post type handling so that the submitted content fields match `post_type` consistently (text vs link vs image). After a successful update, subsequent single-post views and feed views must reflect the updated content according to the post-type display rules: text posts show full text, link posts show the link URL, and image posts show the uploaded/represented image cover with its associated alt text.
 *
 * Error behavior: if the target post does not exist, or if the authenticated member fails the ownership check, the system rejects the request. If the post type-to-content pairing is invalid, the system rejects the request without performing any update.
 *
 * Related operations: clients typically pair this update with post deletion or viewing flows—however, this endpoint does not perform deletion, does not create votes or comments, and does not alter vote/comment contributions. It only updates the post’s core content and corresponding type-specific display fields.
 *
 * @param props.connection
 * @param props.postId Target post ID to update.
 * @param props.body Update payload for the post’s core content. The payload must satisfy the system’s post type-to-content pairing rules (text vs link vs image) and include a non-empty title.
 * @x-autobe-authorization-type null
 * @x-autobe-authorization-actor admin
 * @x-autobe-specification 1) Authenticate caller as member. 2) Load
 *   `community_platform_posts` by id = postId, ensuring the row is accessible
 *   for updates (exclude hard non-existence). 3) Authorization: verify
 *   `community_platform_posts.author_id` matches the authenticated member’s id;
 *   if not, reject. 4) Validate request payload: - title must be non-empty. -
 *   post_type must be one of the supported classification values used by the
 *   system (text/link/image) and the provided content fields must match the
 *   chosen post_type. - For link-type: require/validate `link_url` is provided
 *   and acceptable; refresh the link metadata scalar fields kept on the post
 *   row. - For image-type: require/validate `image_cover_url` (and alt text if
 *   provided) so the post can render an image preview. - For text-type: ensure
 *   body text is provided as the main content representation. 5) Apply update
 *   in a transaction: - Update `title`, `body`, `post_type`, and the relevant
 *   type-specific scalar fields (`link_url`, `image_cover_url`,
 *   `image_alt_text`) on `community_platform_posts`. - Set `edited_by_id` to
 *   the authenticated member id. - Set `edited_at` to current timestamp. 6)
 *   Return the updated post DTO representing how a single post is displayed
 *   (type-specific content fields).
 *
 * Edge cases:
 * - If validation fails, do not write any changes.
 * - If post type changes, overwrite only the relevant type-specific scalar fields so single-post rendering remains consistent with the chosen `post_type`.
 * @path /communityPlatform/admin/posts/:postId
 * @accessor api.functional.communityPlatform.admin.posts.update
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
     * Target post ID to update.
     */
    postId: string & tags.Format<"uuid">;

    /**
     * Update payload for the post’s core content. The payload must satisfy the system’s post type-to-content pairing rules (text vs link vs image) and include a non-empty title.
     */
    body: ICommunityPlatformPost.IUpdate;
  };
  export type Body = ICommunityPlatformPost.IUpdate;
  export type Response = ICommunityPlatformPost;

  export const METADATA = {
    method: "PUT",
    path: "/communityPlatform/admin/posts/:postId",
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
    `/communityPlatform/admin/posts/${encodeURIComponent(props.postId ?? "null")}`;
  export const random = (): ICommunityPlatformPost =>
    typia.random<ICommunityPlatformPost>();
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
 * Permanently removes a post by its identifier from the platform.
 *
 * This endpoint is used when a user requests deletion of a post at `/posts/{postId}`. When the deletion is accepted, the system must remove the post from normal viewing contexts such as feeds and single-post views, so subsequent attempts to view the post (including its content and author details) do not behave as if the post still exists.
 *
 * Authorization is enforced as follows: a user may delete a post only if they are the post’s author, while moderators are allowed to delete any post within their community. If the caller is not permitted to delete the target post, the system must reject the request and must not apply any change.
 *
 * After deletion, the system must ensure the post no longer contributes to comment counts and vote score displays for that post view, because the post is no longer available for viewing.
 *
 * Related operations that are typically used alongside this endpoint include comment listing for a post (so the UI can reload and show the thread without the deleted post) and post voting/commenting operations, which must not be available for a post that has been removed from normal viewing contexts.
 *
 * @param props.connection
 * @param props.postId Target post identifier to erase.
 * @x-autobe-authorization-type null
 * @x-autobe-authorization-actor admin
 * @x-autobe-specification Authorize the caller, then delete the target post and
 *   invalidate any derived browsing contexts.
 *
 * 1) Parse `postId` from the path.
 * 2) Load the target post record by `postId`.
 *    - If the post does not exist or is not accessible in the normal browsing context, reject with a not-found style error (implementation-specific error mapping).
 * 3) Determine the caller actor/identity from the session.
 * 4) Permission checks:
 *    - If caller is a member: allow deletion only if caller is the post author.
 *    - If caller is a moderator: allow deletion if the moderator belongs to the same community that contains the post.
 *    - Otherwise reject without changing anything.
 * 5) Execute deletion in a single transaction:
 *    - Remove the post so it is no longer returned by post browsing queries.
 *    - Ensure related data used for feed counts (vote score aggregates and comment count displays) is not presented for this post anymore. If aggregates are computed on read, ensure post absence causes counts to be skipped; if aggregates are stored, update them accordingly.
 * 6) Return success with an empty JSON body (null response body in API spec).
 *
 * Edge cases:
 * - If permission fails, do not delete the post.
 * - If the caller is attempting to delete a post they do not own (and they are not a moderator of the post’s community), reject.
 * - After successful deletion, follow-up reads for the same `postId` must not show the deleted post content or author details as if it still exists.
 * @path /communityPlatform/admin/posts/:postId
 * @accessor api.functional.communityPlatform.admin.posts.erase
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
     * Target post identifier to erase.
     */
    postId: string & tags.Format<"uuid">;
  };

  export const METADATA = {
    method: "DELETE",
    path: "/communityPlatform/admin/posts/:postId",
    request: null,
    response: {
      type: "application/json",
      encrypted: false,
    },
  } as const;

  export const path = (props: Props) =>
    `/communityPlatform/admin/posts/${encodeURIComponent(props.postId ?? "null")}`;
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
 * Creates a new community post for the authenticated member.
 *
 * This operation is the entry point for the “Post Creation” workflow. It creates the core record in community_platform_posts (including title, posted_at, and the post_type-specific fields such as body for text posts, link_url for link posts, and image_cover_url/image metadata for image posts). It also creates the related dependent content record(s) when needed: link posts use community_platform_post_links to store href/display fields, and image posts use community_platform_post_images to store uploaded image attachment metadata.
 *
 * Authorization and eligibility are enforced according to member actor rules: a member can create posts only in communities they are subscribed to. If the member is not subscribed to the target community, the system must reject the request. If the member is banned from the target community, the system must block creation. Guests are not eligible for this operation.
 *
 * Input validation is strictly applied before persistence. The system rejects requests with a missing or empty title. The system also rejects invalid post_type-to-content pairings: text posts must provide text content, link posts must provide a valid URL, and image posts must provide uploaded image content/URI(s) that can be represented in the schema’s image fields.
 *
 * After successful creation, the system returns the created post data for immediate UI rendering. When the created post is later viewed, the post’s content representation must follow the post_type display rules: text posts show body text, link posts show href, and image posts show the image cover/attachments. The response should also include vote score and comment count representations derived from community_platform_post_votes and community_platform_comments, matching the post viewing expectations.
 *
 * Related operations that typically complement this one include edit and delete operations for posts, and vote/comment operations for the created post. Clients may call the single-post view operation afterward to refresh any derived aggregates if needed.
 *
 *
 * @param props.connection
 * @param props.body Creation payload for a new post. Includes the target community, post_type, title, and the post-type-specific content required to populate community_platform_posts and its dependent link/image tables.
 * @x-autobe-authorization-type null
 * @x-autobe-authorization-actor admin
 * @x-autobe-specification Implement POST /posts as an atomic creation workflow.
 *
 * 1) Authentication/actor resolution
 * - Require authenticated member actor.
 * - Reject guest/unauthenticated requests.
 *
 * 2) Resolve target community
 * - Read community identifier from ICommunityPlatformPost.ICreate requestBody.
 * - Verify the member is subscribed to that community via community_platform_community_subscriptions.
 * - Verify the member is not currently banned in that community via community_platform_community_bans.
 *
 * 3) Validate core inputs
 * - Validate title is present and non-empty (maps to community_platform_posts.title).
 * - Validate post_type is one of the allowed business categories supported by the UI (the value is stored in community_platform_posts.post_type).
 * - Validate content pairing:
 *   - If post_type indicates text: require body_text (maps to community_platform_posts.body).
 *   - If post_type indicates link: require href/url (maps to community_platform_posts.link_url and also community_platform_post_links.href).
 *   - If post_type indicates image: require image cover and at least one image attachment metadata input (maps to community_platform_posts.image_cover_url and community_platform_post_images rows).
 *
 * 4) Transactional persistence
 * - Start a DB transaction.
 * - Insert community_platform_posts with:
 *   - community_id, author_id
 *   - title
 *   - post_type
 *   - body / link_url / image_cover_url based on post_type
 *   - posted_at = current timestamp
 *   - created_at/updated_at
 * - For link posts: insert one community_platform_post_links row with community_platform_post_id and href/display fields; set deleted_at as null.
 * - For image posts: insert community_platform_post_images rows for each attachment, including sort_order, file_url, content_type, file_size_bytes, image_width_px, image_height_px, alt_text.
 * - Commit transaction.
 *
 * 5) Derived aggregates for response
 * - Compute vote score and comment count for the created post based on non-deleted viewing contexts:
 *   - Vote score from community_platform_post_votes where deleted_at is null; compute net effect using vote_value (up minus down) as expected by the domain.
 *   - Comment count from community_platform_comments where deleted_at is null.
 *
 * 6) Response DTO mapping
 * - Map the created post plus derived aggregates into ICommunityPlatformPost.
 * - Ensure content representation is consistent with post_type display rules.
 *
 * 7) Error handling
 * - On validation failures, return 400-level errors with a clear reason (e.g., missing title, invalid pairing, invalid post_type).
 * - On authorization/eligibility failures (not subscribed, banned), return 403-level errors.
 * - On missing/invalid foreign key references, return 404-level errors.
 * - Ensure transaction rollback on any failure during dependent record creation.
 *
 * @path /communityPlatform/admin/posts
 * @accessor api.functional.communityPlatform.admin.posts.create
 * @autobe Generated by AutoBE - https://github.com/wrtnlabs/autobe
 */
export async function create(
  connection: IConnection,
  props: create.Props,
): Promise<void> {
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
     * Creation payload for a new post. Includes the target community, post_type, title, and the post-type-specific content required to populate community_platform_posts and its dependent link/image tables.
     */
    body: ICommunityPlatformPost.ICreate;
  };
  export type Body = ICommunityPlatformPost.ICreate;

  export const METADATA = {
    method: "POST",
    path: "/communityPlatform/admin/posts",
    request: {
      type: "application/json",
      encrypted: false,
    },
    response: {
      type: "application/json",
      encrypted: false,
    },
  } as const;

  export const path = () => "/communityPlatform/admin/posts";
  export const random = (): void => typia.random<void>();
  export const simulate = (
    connection: IConnection,
    props: create.Props,
  ): void => {
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
 * Retrieve a filtered and paginated list of community posts.
 *
 * This operation is exposed as `PATCH /posts` to support complex search criteria in the request body, while still returning read-only results. It is designed to match the platform’s post viewing rules where each post’s representation depends on `community_platform_posts.post_type`: text posts show text previews, link posts show link preview information, and image posts show image thumbnail information.
 *
 * The endpoint reads from `community_platform_posts` (core post metadata such as `title`, `body`, `post_type`, `link_url`, `image_cover_url`, `posted_at`, `edited_at`, and `deleted_at`) and augments results using type-specific tables: `community_platform_post_links` for link preview fields (`href`, `display_title`, `display_description`) and `community_platform_post_images` for selecting an attachment for image thumbnail-style previews.
 *
 * Records should be filtered so that posts marked as removed for normal viewing are not returned (i.e., do not include rows where `community_platform_posts.deleted_at` is set for standard feed/list browsing). Any additional visibility constraints that depend on caller context must be applied before the final page of results is returned.
 *
 * Pagination and sorting are validated based on the request body. If unsupported filter values are provided, the operation returns an empty result set rather than failing the request.
 *
 * @param props.connection
 * @param props.body Search criteria and pagination parameters for locating posts in the feed/list view.
 * @x-autobe-authorization-type null
 * @x-autobe-authorization-actor admin
 * @x-autobe-specification Implement a paginated post search over
 *   `community_platform_posts`.
 *
 * Algorithm:
 * 1. Validate the request body: pagination limits, sorting options, and any optional filters.
 * 2. Build a base query on `community_platform_posts` that excludes non-visible posts for normal viewing (filter out `community_platform_posts.deleted_at IS NOT NULL`).
 * 3. Apply supported filters from the request body (map them to columns in `community_platform_posts`):
 *    - communityId -> `community_platform_posts.community_id`
 *    - authorId -> `community_platform_posts.author_id`
 *    - postType -> `community_platform_posts.post_type`
 *    - postedAt range -> `community_platform_posts.posted_at`
 *    - keyword search (if provided) -> apply to `community_platform_posts.title` and/or `community_platform_posts.body`
 * 4. Sorting: default to `community_platform_posts.posted_at` (descending or as defined by the DTO), and support any additional sortable fields allowed by the request DTO.
 * 5. Pagination: apply page size and offset/cursor semantics as defined by `ICommunityPlatformPost.IRequest`, and return an `IPage...` response.
 * 6. Enrich list rows for previews:
 *    - For link posts: left join `community_platform_post_links` on `community_platform_posts.id = community_platform_post_links.community_platform_post_id` and select preview fields (`href`, `display_title`, `display_description`).
 *    - For image posts: left join `community_platform_post_images` on `community_platform_post_id`; select a single representative image per post for thumbnail-style preview, excluding rows where `community_platform_post_images.deleted_at IS NOT NULL`.
 *    - For text posts: use `community_platform_posts.body` and related list preview rules.
 * 7. Map to `IPageICommunityPlatformPost.ISummary` items.
 *
 * Edge cases:
 * - If a post has missing type-specific metadata rows (e.g., no link row exists), still return the post summary with empty/fallback preview fields.
 *
 * Authorization:
 * - Apply caller visibility constraints for normal viewing contexts prior to returning the page of summaries.
 * @path /communityPlatform/admin/posts
 * @accessor api.functional.communityPlatform.admin.posts.index
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
     * Search criteria and pagination parameters for locating posts in the feed/list view.
     */
    body: ICommunityPlatformPost.IRequest;
  };
  export type Body = ICommunityPlatformPost.IRequest;
  export type Response = IPageICommunityPlatformPost.ISummary;

  export const METADATA = {
    method: "PATCH",
    path: "/communityPlatform/admin/posts",
    request: {
      type: "application/json",
      encrypted: false,
    },
    response: {
      type: "application/json",
      encrypted: false,
    },
  } as const;

  export const path = () => "/communityPlatform/admin/posts";
  export const random = (): IPageICommunityPlatformPost.ISummary =>
    typia.random<IPageICommunityPlatformPost.ISummary>();
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
