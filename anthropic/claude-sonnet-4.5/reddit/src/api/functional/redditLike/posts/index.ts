import { IConnection, HttpError } from "@nestia/fetcher";
import { PlainFetcher } from "@nestia/fetcher/lib/PlainFetcher";
import typia, { tags } from "typia";
import { NestiaSimulator } from "@nestia/fetcher/lib/NestiaSimulator";

import { IRedditLikePost } from "../../../structures/IRedditLikePost";
import { IPageIRedditLikePost } from "../../../structures/IPageIRedditLikePost";
export * as metrics from "./metrics/index";
export * as comments from "./comments/index";
export * as votes from "./votes/index";

/**
 * Search and retrieve a filtered, paginated list of posts.
 *
 * Retrieve a filtered and paginated list of posts from the Reddit-like
 * community platform with comprehensive search, filtering, sorting, and
 * pagination capabilities. This operation provides the primary content
 * discovery mechanism for users browsing posts across multiple communities or
 * within specific communities, supporting all four core sorting algorithms
 * defined in the platform requirements.
 *
 * The operation queries the reddit_like_posts table as the primary data source,
 * joining with type-specific content tables (reddit_like_post_text_content,
 * reddit_like_post_link_content, reddit_like_post_image_content) to include
 * type-discriminated content details. For performance optimization, the
 * operation leverages the mv_reddit_like_post_metrics materialized view to
 * retrieve pre-calculated vote_score and comment_count without expensive
 * real-time aggregation from reddit_like_post_votes and reddit_like_comments
 * tables. The operation joins with reddit_like_communities to include community
 * metadata and with reddit_like_members to include post author information
 * including username and karma scores.
 *
 * Filtering capabilities include community_id filtering to restrict results to
 * specific communities, post type filtering (text, link, image) via the type
 * discriminator field, date range filtering on created_at timestamps to find
 * posts within specific time periods, vote score range filtering using the
 * materialized view metrics, and full-text search on post titles using the
 * PostgreSQL trigram index for fuzzy matching. The operation supports excluding
 * soft-deleted posts by filtering where deleted_at is null, and optionally
 * filtering posts from communities where the authenticated user is banned by
 * checking reddit_like_community_bans.
 *
 * Sorting algorithm support implements the four core content discovery methods
 * specified in requirements document 08-content-sorting-algorithms.md. The
 * 'hot' sorting calculates trending scores based on vote velocity, post age,
 * and engagement momentum with time decay factors, surfacing content gaining
 * traction in the last 24 hours. The 'new' sorting orders posts by created_at
 * timestamp in strict reverse chronological order, giving every post equal
 * initial visibility. The 'top' sorting ranks posts by net vote score from
 * mv_reddit_like_post_metrics with support for time range filters (hour, day,
 * week, month, year, all-time), enabling discovery of highest-quality content
 * within specific periods. The 'controversial' sorting identifies polarizing
 * content by calculating controversy scores based on vote balance (posts near
 * 50/50 upvote/downvote ratio) and total vote volume, requiring minimum
 * engagement thresholds to surface genuinely divisive discussions.
 *
 * Pagination support includes configurable page size with recommended default
 * of 25-50 posts per page, offset-based or cursor-based pagination for
 * consistent browsing, and total count of matching posts for pagination
 * controls. The operation maintains query performance through strategic
 * indexing on reddit_like_posts(reddit_like_community_id, created_at),
 * reddit_like_posts(type, created_at), and the title trigram index for search
 * queries. Response time targets maintain under 2 seconds for initial page load
 * under normal load conditions per performance requirements.
 *
 * Security considerations include public access allowing guests to view posts
 * from public communities without authentication, optional authentication to
 * personalize results based on user subscriptions and preferences, and
 * automatic filtering of posts from private communities
 * (reddit_like_communities.privacy_type='private') unless the authenticated
 * user is an approved member. The operation respects community privacy settings
 * and ban status, excluding content the requesting user should not access.
 *
 * Related operations include POST /posts for creating new posts, GET
 * /posts/{postId} for retrieving individual post details with full content and
 * comment threads, PUT /posts/{postId} for editing post content, DELETE
 * /posts/{postId} for removing posts, and GET /communities/{communityId}/posts
 * for community-specific post listing. The search operation integrates with the
 * voting system (reddit_like_post_votes), karma system
 * (reddit_like_user_karma), and community subscription system
 * (reddit_like_community_subscriptions) to provide comprehensive post discovery
 * and content curation.
 *
 * @param props.connection
 * @param props.body Search criteria including filters, sorting preferences,
 *   pagination settings, and optional text search query
 * @path /redditLike/posts
 * @accessor api.functional.redditLike.posts.index
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
     * Search criteria including filters, sorting preferences, pagination
     * settings, and optional text search query
     */
    body: IRedditLikePost.IRequest;
  };
  export type Body = IRedditLikePost.IRequest;
  export type Response = IPageIRedditLikePost.ISummary;

  export const METADATA = {
    method: "PATCH",
    path: "/redditLike/posts",
    request: {
      type: "application/json",
      encrypted: false,
    },
    response: {
      type: "application/json",
      encrypted: false,
    },
  } as const;

  export const path = () => "/redditLike/posts";
  export const random = (): IPageIRedditLikePost.ISummary =>
    typia.random<IPageIRedditLikePost.ISummary>();
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
 * Retrieve detailed information about a specific post by its unique identifier.
 *
 * Retrieve comprehensive information about a single post identified by the
 * postId path parameter. This operation returns complete post details including
 * title, content, author information, community association, timestamps, vote
 * scores, and comment counts.
 *
 * This endpoint serves as the primary method for displaying full post details
 * when users click on a post from feeds or community listings. The response
 * includes type-specific content based on the post's type discriminator: for
 * text posts, the operation returns the markdown body content from
 * reddit_like_post_text_content; for link posts, it returns the URL, domain,
 * and extracted metadata from reddit_like_post_link_content; for image posts,
 * it returns image URLs for all resolutions (original, medium, thumbnail) along
 * with dimensions and optional caption from reddit_like_post_image_content.
 *
 * The operation integrates with the voting system by returning current vote
 * scores calculated from reddit_like_post_votes, and displays total comment
 * count aggregated from reddit_like_comments. These engagement metrics may be
 * sourced from the mv_reddit_like_post_metrics materialized view for optimized
 * performance.
 *
 * Security considerations include handling deleted posts (where deleted_at is
 * non-null) by returning appropriate error responses or limited metadata, and
 * applying community privacy settings for posts in private communities. The
 * operation enforces no authentication requirements, allowing guests to view
 * posts in public communities, while private community posts require membership
 * verification.
 *
 * This operation relates to the post creation workflow documented in the
 * Content Creation requirements, supporting the complete user journey from post
 * discovery through detailed viewing. Users typically access this endpoint
 * after viewing post summaries in sorted feeds (hot, new, top, controversial
 * sorting algorithms) or from user profile post histories.
 *
 * @param props.connection
 * @param props.postId Unique identifier of the target post to retrieve
 * @path /redditLike/posts/:postId
 * @accessor api.functional.redditLike.posts.at
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
    /** Unique identifier of the target post to retrieve */
    postId: string & tags.Format<"uuid">;
  };
  export type Response = IRedditLikePost;

  export const METADATA = {
    method: "GET",
    path: "/redditLike/posts/:postId",
    request: null,
    response: {
      type: "application/json",
      encrypted: false,
    },
  } as const;

  export const path = (props: Props) =>
    `/redditLike/posts/${encodeURIComponent(props.postId ?? "null")}`;
  export const random = (): IRedditLikePost => typia.random<IRedditLikePost>();
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
 * Retrieve a paginated list of posts sorted by hot algorithm showing currently
 * trending content.
 *
 * Retrieve a filtered and paginated list of posts sorted by the hot algorithm,
 * which surfaces currently trending and popular content based on vote momentum
 * and recency. This operation implements the Hot Algorithm requirements from
 * the Content Sorting Algorithms specification, calculating hot scores that
 * balance net vote scores with time decay to ensure fresh, engaging content
 * appears prominently.
 *
 * The hot algorithm prioritizes posts that are gaining traction right now
 * rather than simply displaying the most-voted content of all time. Posts
 * created within the last 6-12 hours have an advantage over older posts with
 * similar vote counts. Early engagement is rewarded, with posts gaining 10+
 * votes in the first hour ranking higher than posts with the same votes
 * accumulated over 6 hours. The hot score decreases exponentially with post
 * age, ensuring the feed remains dynamic and constantly changing.
 *
 * This operation queries the reddit_like_posts table joined with
 * mv_reddit_like_post_metrics for pre-calculated vote scores and comment
 * counts, applying the hot score calculation formula that considers vote
 * velocity, time decay, and engagement patterns. Posts with negative net votes
 * are suppressed with very low hot scores, while posts receiving rapid upvotes
 * receive velocity bonuses that boost their hot scores above linear
 * expectations.
 *
 * The request body supports comprehensive filtering options including community
 * restrictions (filter by specific community IDs or retrieve from all
 * communities), time range filters (limit to posts created within specified
 * time windows), pagination controls (page number and page size), and search
 * keywords (filter posts by title or content matching). When no community
 * filter is provided, the operation returns hot posts from all public
 * communities, creating a platform-wide trending feed.
 *
 * Security considerations include ensuring guests and authenticated users can
 * both access this public content discovery endpoint. The operation respects
 * community privacy settings, excluding posts from private communities unless
 * the requesting user is an approved member. Deleted or moderator-removed posts
 * are excluded from results automatically.
 *
 * The operation integrates with the voting system to use current vote scores,
 * the content creation system to respect post metadata, and the community
 * system to enforce privacy rules. Hot scores are recalculated periodically
 * (recommended every 5-15 minutes) to ensure feed freshness, with the
 * materialized view providing performant access to pre-calculated metrics
 * without impacting vote write performance.
 *
 * @param props.connection
 * @param props.body Search and filter criteria for hot posts including optional
 *   community filters, time ranges, pagination, and search keywords
 * @path /redditLike/posts/hot
 * @accessor api.functional.redditLike.posts.hot
 * @autobe Generated by AutoBE - https://github.com/wrtnlabs/autobe
 */
export async function hot(
  connection: IConnection,
  props: hot.Props,
): Promise<hot.Response> {
  return true === connection.simulate
    ? hot.simulate(connection, props)
    : await PlainFetcher.fetch(
        {
          ...connection,
          headers: {
            ...connection.headers,
            "Content-Type": "application/json",
          },
        },
        {
          ...hot.METADATA,
          path: hot.path(),
          status: null,
        },
        props.body,
      );
}
export namespace hot {
  export type Props = {
    /**
     * Search and filter criteria for hot posts including optional community
     * filters, time ranges, pagination, and search keywords
     */
    body: IRedditLikePost.IHotRequest;
  };
  export type Body = IRedditLikePost.IHotRequest;
  export type Response = IPageIRedditLikePost.ISummary;

  export const METADATA = {
    method: "PATCH",
    path: "/redditLike/posts/hot",
    request: {
      type: "application/json",
      encrypted: false,
    },
    response: {
      type: "application/json",
      encrypted: false,
    },
  } as const;

  export const path = () => "/redditLike/posts/hot";
  export const random = (): IPageIRedditLikePost.ISummary =>
    typia.random<IPageIRedditLikePost.ISummary>();
  export const simulate = (
    connection: IConnection,
    props: hot.Props,
  ): Response => {
    const assert = NestiaSimulator.assert({
      method: METADATA.method,
      host: connection.host,
      path: hot.path(),
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
