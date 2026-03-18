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
 * @x-autobe-authorization-actor guest
 * @x-autobe-specification 1) Validate inputs
 * - Parse postId from path as UUID (use repository/service layer UUID parsing).
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
 * @path /communityPlatform/guest/posts/:postId
 * @accessor api.functional.communityPlatform.guest.posts.at
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
    path: "/communityPlatform/guest/posts/:postId",
    request: null,
    response: {
      type: "application/json",
      encrypted: false,
    },
  } as const;

  export const path = (props: Props) =>
    `/communityPlatform/guest/posts/${encodeURIComponent(props.postId ?? "null")}`;
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
 * @x-autobe-authorization-actor guest
 * @x-autobe-specification Implement a paginated post search over `community_platform_posts`.
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
 * @path /communityPlatform/guest/posts
 * @accessor api.functional.communityPlatform.guest.posts.index
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
    path: "/communityPlatform/guest/posts",
    request: {
      type: "application/json",
      encrypted: false,
    },
    response: {
      type: "application/json",
      encrypted: false,
    },
  } as const;

  export const path = () => "/communityPlatform/guest/posts";
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
