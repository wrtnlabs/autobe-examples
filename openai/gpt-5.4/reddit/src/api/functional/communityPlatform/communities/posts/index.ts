import {
  HttpError,
  IConnection,
  NestiaSimulator,
  PlainFetcher,
} from "@nestia/fetcher";
import typia, { tags } from "typia";

import { ICommunityPlatformPost } from "../../../../structures/ICommunityPlatformPost";
import { IPageICommunityPlatformPost } from "../../../../structures/IPageICommunityPlatformPost";

/**
 * Retrieve a paginated feed of posts that belong to a single community.
 *
 * This operation provides the community-specific feed described in the business requirements. It returns only posts whose container community matches the requested community identifier, allowing visitors and members to browse the content published within that one shared space. In line with the loaded schema for community_platform_posts, the feed is built from post records that carry the canonical post identity, author membership reference, container community reference, title, post type classification, lifecycle status, and creation timestamps. In line with the loaded schema for community_platform_communities, the selected community acts as the parent context for discovery and participation decisions, and its identity determines which posts are eligible for inclusion.
 *
 * This endpoint is available to both guests and logged-in members because the requirements explicitly state that the community feed is publicly viewable. The operation is read-only and does not require community subscription merely to browse posts. However, only posts that are in a viewable business state should be returned. Records that are deleted, unavailable, or otherwise not suitable for public feed presentation must be excluded according to lifecycle status and moderation rules implemented by the service layer.
 *
 * The request body supports structured feed browsing behavior. The requirements state that all post feeds are paginated and that users may reorder results using sort options such as hot, new, top, and controversial. The service must also support the top time filter values today, this week, this month, this year, and all time, while ignoring that filter whenever the selected sort is not top. Feed items should be returned as summaries suitable for list presentation, including the post title and post-type-dependent preview behavior defined in the requirements: text posts should expose a short text preview, image posts should expose thumbnail-oriented summary data, and link posts should expose URL domain-oriented summary data.
 *
 * This operation is commonly used before a client navigates to a post detail endpoint. A user typically opens a community page, executes this feed operation to browse summarized posts, and then follows an individual result into the single-post retrieval flow for complete content and discussion. Because this endpoint is scoped by path, clients must first know the target community identifier from a community listing or community detail retrieval operation before calling it.
 *
 * If the community does not exist, has been removed from active use, or is not eligible for public browsing, the service should reject the request rather than returning unrelated data. If paging or sorting values are invalid, the service should return a validation error. Successful responses must preserve deterministic ordering for the selected sort mode so that pagination remains stable across repeated browsing requests.
 *
 * @param props.connection
 * @param props.communityId Target community identifier
 * @param props.body Community feed pagination and sorting criteria
 * @x-autobe-authorization-type null
 * @x-autobe-authorization-actor null
 * @x-autobe-specification Resolve the target community by community_platform_communities.id and verify that the community exists and is in a browsable state before querying posts. If the community cannot be found or is not available for feed browsing, return an appropriate not-found or forbidden-style business error according to platform rules.
 *
 * Parse the ICommunityPlatformPost.IRequest body to obtain pagination inputs, requested sort mode, and optional top-period filter. Because this is an index operation, do not read community scope from the request body; the communityId path parameter is the sole community selector. Validate pagination bounds and validate that the top-period filter is accepted only as a ranking constraint when sort is top. If another sort mode is selected, ignore the supplied top-period filter rather than changing the query scope.
 *
 * Query community_platform_posts as the primary source table, filtering by community_platform_community_id equal to the path parameter. Exclude records that are deleted or not in a publicly viewable lifecycle status. Join or aggregate related data needed for feed summaries, including author presentation data, community presentation data, vote score, and comment count. Use the post_type column to determine which subtype data must be fetched from the normalized content tables for summary preview generation, such as text preview extraction, image thumbnail metadata, or link-domain presentation.
 *
 * Apply sort behavior as follows: new sorts by created_at descending; top sorts by vote score within the requested time window; controversial ranks posts with high vote activity and near-balanced scores ahead of low-engagement posts; hot uses a recency-plus-engagement ranking strategy that favors recently active posts with strong upvote activity. Ensure secondary ordering includes a stable tie-breaker such as created_at and id so paginated traversal is deterministic.
 *
 * Return IPageICommunityPlatformPost.ISummary with pagination metadata and summary rows only. Each summary should contain the fields necessary for community feed rendering, including title, author display information, community title, computed vote score, computed comment count, created-at-derived recency information, and a post-type-appropriate preview representation. Do not return full post bodies intended for the post detail operation. Keep the implementation read-only and free of side effects.
 * @path /communityPlatform/communities/:communityId/posts
 * @accessor api.functional.communityPlatform.communities.posts.index
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
          path: index.path(props),
          status: null,
        },
        props.body,
      );
}
export namespace index {
  export type Props = {
    /**
     * Target community identifier
     */
    communityId: string & tags.Format<"uuid">;

    /**
     * Community feed pagination and sorting criteria
     */
    body: ICommunityPlatformPost.IRequest;
  };
  export type Body = ICommunityPlatformPost.IRequest;
  export type Response = IPageICommunityPlatformPost.ISummary;

  export const METADATA = {
    method: "PATCH",
    path: "/communityPlatform/communities/:communityId/posts",
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
    `/communityPlatform/communities/${encodeURIComponent(props.communityId ?? "null")}/posts`;
  export const random = (): IPageICommunityPlatformPost.ISummary =>
    typia.random<IPageICommunityPlatformPost.ISummary>();
  export const simulate = (
    connection: IConnection,
    props: index.Props,
  ): Response => {
    const assert = NestiaSimulator.assert({
      method: METADATA.method,
      host: connection.host,
      path: index.path(props),
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
