import {
  HttpError,
  IConnection,
  NestiaSimulator,
  PlainFetcher,
} from "@nestia/fetcher";
import typia, { tags } from "typia";

import { ICommunityPlatformComment } from "../../../../structures/ICommunityPlatformComment";
import { IPageICommunityPlatformComment } from "../../../../structures/IPageICommunityPlatformComment";

/**
 * Retrieve the discussion comments for a specific post.
 *
 * This operation returns the comment thread that belongs to the target post identified by `postId`. In the community platform domain, a post is the root content item of a discussion, and each comment belongs to one post and one authoring user. A comment may also belong to a parent comment, which means the returned data must respect the nested discussion structure described in the requirements. Replies are not independent discussion roots; they remain attached to the correct branch of the same post discussion, and the client can use this operation to render the full conversation beneath the post.
 *
 * This endpoint is available to both guests and members because the requirements explicitly state that guests and members can view comments on a post and can change comment sorting. The operation is read-only. It does not create a new comment, does not change vote state, and does not alter moderation status. Its purpose is to let clients browse the discussion in the same post context while selecting the ordering strategy that best fits the viewing experience.
 *
 * The sorting behavior of this operation follows the business requirements for post discussions. The request body should allow the caller to choose among Best, New, and Controversial ordering. Best places higher-scoring comments first, New places the most recently posted comments first, and Controversial prioritizes comments with many votes and a score close to zero. Even when the order changes, the operation must preserve the thread structure so that replies continue to appear beneath their parent comment rather than being detached into a flat list. This is essential because the requirements define comments as a nested reply chain with unlimited depth.
 *
 * Implementation of this operation depends on the underlying comment and post data model. The service should validate that the referenced post exists and is available for discussion browsing before loading any comments. It should then read comments associated with that post, derive vote-based ranking data as needed for Best or Controversial ordering, and assemble the result in a thread-aware form that preserves parent-child relationships. If the target post is unavailable, the operation should fail according to the platform's comment and post browsing error rules rather than returning misleading partial data.
 *
 * This operation is commonly used together with the post detail retrieval endpoint. A client would typically retrieve the post itself first, then call this endpoint to load the associated discussion thread for display below the post content. After a successful comment creation or reply creation operation, the client may call this endpoint again to refresh the discussion and show the newly added comment in the correct thread branch under the same post.
 *
 * @param props.connection
 * @param props.postId Target post's ID
 * @param props.body Comment sorting and pagination criteria for the post discussion
 * @x-autobe-authorization-type null
 * @x-autobe-authorization-actor null
 * @x-autobe-specification Accept `postId` as the target post identifier and a
 *   JSON request body typed as `ICommunityPlatformComment.IRequest` containing
 *   pagination and thread-browsing criteria, including the requested sorting
 *   mode for the discussion.
 *
 * Validate that the target post exists in `community_platform_posts` and is available for discussion browsing. If the post cannot be found or is not available, return the appropriate business error for comment browsing on an unavailable post.
 *
 * Query `community_platform_comments` for records whose post foreign key matches the target post. Load the author/profile data required by the comment response shape through the relevant member and profile relationships. For score-based ordering, incorporate aggregate vote data from `community_platform_comment_votes` so Best sorting can order by highest score and Controversial sorting can prioritize comments with high total voting activity and a score near zero. For New sorting, order by the comment creation timestamp descending.
 *
 * While applying the selected ordering, preserve the reply hierarchy defined by the parent-comment relationship. The service must not flatten the thread in a way that loses parent-child associations. Root comments should be identified first, and child comments should be attached recursively beneath their parent comments. Support unlimited reply depth as required by the domain behavior.
 *
 * Apply pagination at the discussion retrieval boundary in a way that remains consistent with the DTO contract. If the implementation paginates root comments, ensure descendants needed to preserve visible thread integrity are included according to the request contract. Return a response typed as `IPageICommunityPlatformComment` containing the paginated discussion data for the specified post context.
 *
 * Do not modify comment, vote, post, report, or moderation records in this operation. This endpoint is strictly for retrieval. Ensure repeated requests with the same post context and different sorting criteria return the same browseable discussion scope with only the ordering changed.
 * @path /communityPlatform/posts/:postId/comments
 * @accessor api.functional.communityPlatform.posts.comments.index
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
     * Target post's ID
     */
    postId: string & tags.Format<"uuid">;

    /**
     * Comment sorting and pagination criteria for the post discussion
     */
    body: ICommunityPlatformComment.IRequest;
  };
  export type Body = ICommunityPlatformComment.IRequest;
  export type Response = IPageICommunityPlatformComment;

  export const METADATA = {
    method: "PATCH",
    path: "/communityPlatform/posts/:postId/comments",
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
    `/communityPlatform/posts/${encodeURIComponent(props.postId ?? "null")}/comments`;
  export const random = (): IPageICommunityPlatformComment =>
    typia.random<IPageICommunityPlatformComment>();
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
 * Retrieve the detailed representation of a single discussion comment within a specific post thread.
 *
 * This operation returns one comment record that belongs to the post identified by `postId` and the comment identified by `commentId`. In the community platform domain, threaded discussion comments are written by members within post conversations, and a comment belongs to one post, one authoring user, and optionally one parent comment when it is a reply. Because comments are part of a post-centered discussion hierarchy, this endpoint must resolve the comment in the context of its parent post rather than as a detached standalone resource.
 *
 * From an access perspective, this operation is intended for actors who are allowed to browse public discussions. Guests can browse public feeds, communities, posts, comments, and user profiles, and members can also browse the same content while additionally participating in discussions. The operation must therefore permit read access to guest and member actors when the related post and community are viewable, while still rejecting access when the parent post or surrounding discussion is unavailable under platform rules.
 *
 * The returned resource should reflect the threaded nature of `community_platform_comments`, which the requirements describe as discussion comments written by members within post conversations. A comment may reply to another comment, and the platform preserves the full nested reply chain so each reply remains attached to the correct branch of the discussion. Even though this endpoint returns one comment rather than a whole thread, its payload should still expose enough structural information for clients to place the comment correctly inside the post discussion, including its relationship to the parent post and any parent comment reference used by nested replies.
 *
 * This operation is commonly used together with the post discussion browsing API for comment lists. Clients typically obtain the broader discussion context by listing comments for a post, where the platform supports Best, New, and Controversial ordering while preserving thread structure. After identifying a specific discussion entry from that list or from a notification or direct link, clients can call this endpoint to retrieve the full detail for the targeted comment.
 *
 * If the specified post has no matching comment, if the comment belongs to a different post, or if the parent post is unavailable for viewing, the operation must fail rather than returning unrelated data. This behavior aligns with the business rule that comments are attached to a post discussion and that unavailable content cannot be interacted with or presented as if it were valid in the requested thread context.
 *
 * @param props.connection
 * @param props.postId Target post's ID
 * @param props.commentId Target comment's ID within the post discussion
 * @x-autobe-authorization-type null
 * @x-autobe-authorization-actor null
 * @x-autobe-specification Implement a read-only service method that loads a
 *   single record from the comment domain scoped by both the parent post
 *   identifier and the comment identifier.
 *
 * First, validate that `postId` and `commentId` are syntactically valid UUID values. Query `community_platform_posts` to confirm that the target post exists and is viewable in its community context. Then query `community_platform_comments` by `id = commentId` and `post_id = postId` in the same lookup condition so that a comment cannot be retrieved through an unrelated post path. If no row matches both conditions, return a not-found error.
 *
 * After locating the comment, load the related data needed for the detailed DTO: the author member relationship and its public profile projection if exposed by the DTO, the parent comment reference when the comment is a reply, and any aggregate vote or reply counters only if those fields are part of the generated response schema. Do not invent fields that are not present in the schema; map only verified columns and supported derived values. If attached comment files are part of the comment detail schema, load them from `community_platform_comment_files` in stable order.
 *
 * Apply visibility checks before returning the result. Guests and members may read public discussion content, but the service must deny retrieval when the parent post is unavailable according to content lifecycle rules. If the author account was deleted and the comment was removed from threads, the query should naturally yield no active comment for presentation. This endpoint does not alter sorting or thread order because it returns only one comment.
 *
 * Return the comment as `ICommunityPlatformComment`. The implementation should keep database access read-only, avoid side effects, and produce deterministic not-found behavior for any mismatch between `postId`, `commentId`, and the persisted post-comment relationship.
 * @path /communityPlatform/posts/:postId/comments/:commentId
 * @accessor api.functional.communityPlatform.posts.comments.at
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
     * Target post's ID
     */
    postId: string & tags.Format<"uuid">;

    /**
     * Target comment's ID within the post discussion
     */
    commentId: string & tags.Format<"uuid">;
  };
  export type Response = ICommunityPlatformComment;

  export const METADATA = {
    method: "GET",
    path: "/communityPlatform/posts/:postId/comments/:commentId",
    request: null,
    response: {
      type: "application/json",
      encrypted: false,
    },
  } as const;

  export const path = (props: Props) =>
    `/communityPlatform/posts/${encodeURIComponent(props.postId ?? "null")}/comments/${encodeURIComponent(props.commentId ?? "null")}`;
  export const random = (): ICommunityPlatformComment =>
    typia.random<ICommunityPlatformComment>();
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
      assert.param("commentId")(() => typia.assert(props.commentId));
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
