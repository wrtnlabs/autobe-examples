import {
  HttpError,
  IConnection,
  NestiaSimulator,
  PlainFetcher,
} from "@nestia/fetcher";
import typia, { tags } from "typia";

import { ICommunityPlatformPostVote } from "../../../../../structures/ICommunityPlatformPostVote";

/**
 * Create the authenticated member's active vote for a specific post.
 *
 * This operation records the caller's current reaction direction on a single post in the community platform. The underlying vote record corresponds to the database model `community_platform_post_votes`, which is described as one current vote stance by a member on a post. The operation is scoped by the target post identified by `postId`, and the created vote is linked to both the acting member and the target record in `community_platform_posts`, the top-level community post entity that stores shared post identity, authorship, community placement, content type classification, and lifecycle state.
 *
 * Only authenticated members may call this operation. Guests must not be allowed to cast votes. The system must also enforce the business rule that only one active vote may exist per member for the same post at any time. The database schema explicitly supports this rule through the composite uniqueness constraint on `community_platform_member_id` and `community_platform_post_id` in `community_platform_post_votes`. As a result, this endpoint behaves as the member's authoritative way to establish the current vote stance for the specified post rather than allowing duplicate parallel vote records.
 *
 * This operation has business effects beyond merely writing a relation row. The requirements state that a post's visible score is calculated as total upvotes minus total downvotes, and that post vote effects must be applied to the post author's single karma score in parallel with the vote change. Therefore, when a new upvote is recorded or an existing direction is changed, the service must recalculate the resulting active vote effect for the post and adjust the post author's karma consistently with the final current state. The `direction` column in `community_platform_post_votes` is the source value that determines whether the vote contributes positively or negatively.
 *
 * The target post must exist and must be in a state where voting is allowed according to business rules derived from the post lifecycle state stored in `community_platform_posts.status`. The service should reject attempts to vote on unavailable, removed, or otherwise ineligible posts. The endpoint should also reject malformed or unsupported vote directions instead of inferring a default. If the member already has an active vote on the post, the implementation should preserve the one-vote-per-member-per-post rule by updating the existing active stance or by applying equivalent upsert logic rather than creating a second active record.
 *
 * This endpoint is commonly used together with feed and post-detail retrieval operations that display the recalculated visible score and the caller's current voting state. A client will typically load a post or feed, invoke this operation to cast or change the vote, and then refresh or merge the returned vote state with post presentation data. The dependency is not a hard pre-execution requirement, but consumer applications usually pair this endpoint with post detail or feed browsing APIs so that users can immediately see the score impact reflected in the interface.
 *
 * @param props.connection
 * @param props.postId Target post ID
 * @param props.body Requested vote direction for the target post
 * @x-autobe-authorization-type null
 * @x-autobe-authorization-actor member
 * @x-autobe-specification Authenticate the caller as a member and resolve the acting member's `community_platform_members.id` from the session context. Reject unauthenticated callers.
 *
 * Load the target post from `community_platform_posts` by `id = postId` and ensure it exists. Validate that the post is in a business state that allows voting by checking `status` and any deletion condition derived from `deleted_at`. Reject requests for unavailable or non-voteable posts.
 *
 * Validate the request body's vote direction against the supported domain values for post reactions, such as upvote or downvote. Do not accept unspecified or unknown direction values.
 *
 * Within a transaction, query `community_platform_post_votes` for the unique pair `(community_platform_member_id, community_platform_post_id)` matching the acting member and target post. If no active vote record exists, create a new row with a generated UUID, the acting member id, the post id, the requested direction, current timestamps for `created_at` and `updated_at`, and `deleted_at = null`.
 *
 * If a vote record already exists for the member-post pair, update that existing row so that the final persisted `direction` matches the requested current stance, set `updated_at` to the current timestamp, and keep the uniqueness guarantee intact. The implementation must never create a second active vote row for the same member and post.
 *
 * After persistence, recalculate the post's effective visible score from active post votes as total upvotes minus total downvotes, using only rows in `community_platform_post_votes` where `deleted_at` is null. Apply the corresponding karma effect to the post author from `community_platform_posts.community_platform_member_id`. The adjustment must reflect the final transition of the member's current vote state so that karma changes are correct for first-time votes and direction changes.
 *
 * Return the resulting active `community_platform_post_votes` record as the response payload. If concurrency produces a uniqueness conflict, handle it by retrying with upsert-style logic or by translating the conflict into the same single-vote final state rather than surfacing duplicate-vote behavior to clients.
 * @path /communityPlatform/member/posts/:postId/votes
 * @accessor api.functional.communityPlatform.member.posts.votes.create
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
    /**
     * Target post ID
     */
    postId: string & tags.Format<"uuid">;

    /**
     * Requested vote direction for the target post
     */
    body: ICommunityPlatformPostVote.ICreate;
  };
  export type Body = ICommunityPlatformPostVote.ICreate;
  export type Response = ICommunityPlatformPostVote;

  export const METADATA = {
    method: "POST",
    path: "/communityPlatform/member/posts/:postId/votes",
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
    `/communityPlatform/member/posts/${encodeURIComponent(props.postId ?? "null")}/votes`;
  export const random = (): ICommunityPlatformPostVote =>
    typia.random<ICommunityPlatformPostVote>();
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
 * Replace the authenticated member's current vote stance for a specific post.
 *
 * This operation manages the member-owned reaction record for a post in the community platform. A post vote is the recorded reaction of one user to one post, and its core business attribute is the current scoring stance represented by the vote choice. In the underlying data model, `community_platform_post_votes` stores one current vote stance by a member on a post and keeps only the normalized voting relationship and raw direction value needed to derive score changes and author karma effects. The related `community_platform_posts` record represents the top-level community post whose visible score is affected by the vote.
 *
 * Only an authenticated member may call this operation because votes belong to the user who cast them and are part of that user's participation within the platform. The target post is identified by `postId`, which references `community_platform_posts.id`. The caller does not provide a member identifier in the route or body because the active vote is scoped to the authenticated member and the target post together. The service must therefore resolve the member from the current session and apply the change only to that member's own vote relationship.
 *
 * A successful update replaces the caller's current recorded stance for the specified post with the submitted direction. Because a post vote contributes to the visible score of the related post, the system must recalculate the post score from the resulting active votes after the direction change. In parallel, the same change must update the post author's single karma score so that the author's reputation reflects only the latest active vote state. This behavior aligns with the business rule that post score is total upvotes minus total downvotes and that author karma moves upward or downward according to active received votes.
 *
 * This operation should be used when the member already has an active opinion about the post and wants that opinion to become the new current stance, such as changing from an upvote to a downvote or reaffirming a specific direction through an idempotent replacement request. If the target post does not exist, is no longer available for voting, or the caller is not authenticated as a member, the request must fail without changing any vote, score, or karma state. Vote removal is not handled by this operation and must be performed through a separate removal endpoint so that the semantics of replacement and removal remain distinct.
 *
 * @param props.connection
 * @param props.postId Target post identifier
 * @param props.body Replacement vote direction for the target post
 * @x-autobe-authorization-type null
 * @x-autobe-authorization-actor member
 * @x-autobe-specification Resolve the authenticated member from the active session and reject the request if the caller is not a member.
 *
 * Load the target record from `community_platform_posts` by `postId`. Reject when the post does not exist. Before applying the vote change, verify the post is in a state that still permits member voting according to platform rules for content availability and moderation status. Do not create or update votes for posts that are unavailable for normal interaction.
 *
 * Within a transaction, find the member's active vote in `community_platform_post_votes` for the pair (`community_platform_member_id`, `community_platform_post_id`) where `deleted_at` is null. If no vote record exists, either create the normalized current vote record using the submitted direction or upsert by the composite unique key depending on repository style, but the resulting persistent state must contain exactly one current vote for this member and post. If a record exists, replace its `direction`, clear any inactive-state ambiguity if needed, and update `updated_at`. Preserve the one-vote-per-member-per-post invariant enforced by the composite uniqueness rule.
 *
 * After the vote record is written, recalculate the post's visible vote score from all active votes on the post as total upvotes minus total downvotes. Then recalculate or adjust the post author's platform-wide karma so that it reflects the latest active vote state for this post vote. Score and karma updates must occur in the same transaction as the vote change to avoid inconsistency between the member's recorded stance, the displayed post score, and the author's reputation.
 *
 * Return the resulting current `community_platform_post_votes` resource for the authenticated member and target post. Handle idempotent requests by returning success even when the submitted direction matches the existing active direction, while still ensuring the stored state is correct. Surface not-found, unauthorized, and business-rule violations with clear errors. Do not implement vote removal in this operation; removal belongs to a dedicated erase-style endpoint.
 * @path /communityPlatform/member/posts/:postId/votes
 * @accessor api.functional.communityPlatform.member.posts.votes.update
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
     * Target post identifier
     */
    postId: string & tags.Format<"uuid">;

    /**
     * Replacement vote direction for the target post
     */
    body: ICommunityPlatformPostVote.IUpdate;
  };
  export type Body = ICommunityPlatformPostVote.IUpdate;
  export type Response = ICommunityPlatformPostVote;

  export const METADATA = {
    method: "PUT",
    path: "/communityPlatform/member/posts/:postId/votes",
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
    `/communityPlatform/member/posts/${encodeURIComponent(props.postId ?? "null")}/votes`;
  export const random = (): ICommunityPlatformPostVote =>
    typia.random<ICommunityPlatformPostVote>();
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
 * Remove the authenticated member's current vote from a specific post.
 *
 * This operation ends the caller's active post reaction for the target post and returns the member-post pair to the no-vote state described by the voting lifecycle. In the underlying data model, community_platform_post_votes stores one current vote stance by a member on a post and exists specifically to represent the active reaction direction that a specific member has applied to a specific post. Deleting through this endpoint therefore removes that active relationship from platform use for the addressed post rather than modifying the post itself.
 *
 * The target post is identified by the postId path parameter, which maps to the primary key of community_platform_posts. That post record represents a top-level community post authored by a member within a specific community and contains the shared identity, authorship, community placement, content-type classification, and lifecycle state of the post. The removal logic must respect the post lifecycle and must not treat deleted or unavailable posts as valid active voting targets. The vote removal must also reflect the business rule that deleting a vote changes both the post score and the affected author's karma so that aggregate state remains consistent with the member's current stance.
 *
 * Access to this operation is limited to authenticated members acting on their own vote relationship. Guests can browse public content but are not allowed to participate in voting actions, and this endpoint is not designed for moderators or administrators to remove another member's reaction by impersonation or override. The request path intentionally omits a member identifier because ownership is derived from the authenticated session and because community_platform_post_votes enforces a single current vote relationship per member and post combination.
 *
 * Clients typically use this operation after previously creating or changing a vote on the same post through a vote creation or update flow. After successful completion, the caller should expect the member to have no active vote on the post. If the specified post does not exist, is no longer available for active interaction, or the caller has no active vote to remove, the service should reject the request with an appropriate error. Consumers that need refreshed post totals or current vote state should perform a follow-up read operation on the related post resource.
 *
 * @param props.connection
 * @param props.postId Target post's ID
 * @x-autobe-authorization-type null
 * @x-autobe-authorization-actor member
 * @x-autobe-specification Authenticate the caller as a member and derive the acting member identifier from the session context.
 *
 * Load the target community_platform_posts row by id = postId. Reject when the post does not exist. Reject when the post has been deleted or is otherwise not in an active state that can accept vote interaction, based on the post status and deleted_at fields.
 *
 * Load the caller's active community_platform_post_votes row using the composite business key (community_platform_member_id, community_platform_post_id) for the authenticated member and target post. Treat only a non-deleted vote row as removable. If no active vote exists, return an error indicating there is no current vote to remove.
 *
 * Perform the removal in a transaction. Mark the vote as removed from active use by updating deleted_at to the current timestamp and updating updated_at, or apply the service's canonical removal strategy consistent with the schema and repository conventions for active vote records. During the same transaction, recalculate or apply the corresponding post score delta based on the removed direction and reverse the associated karma effect for the post author. Ensure the post author's identity is taken from community_platform_posts.community_platform_member_id rather than client input.
 *
 * After persistence succeeds, return success with no response body. The implementation must be idempotency-aware at the business level only insofar as repeated deletes without an active vote should not silently invent success; they should be rejected as an invalid state transition. Concurrency handling should prevent double-removal of the same active vote and keep score and karma adjustments consistent with the final stored vote state.
 * @path /communityPlatform/member/posts/:postId/votes
 * @accessor api.functional.communityPlatform.member.posts.votes.erase
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
     * Target post's ID
     */
    postId: string & tags.Format<"uuid">;
  };

  export const METADATA = {
    method: "DELETE",
    path: "/communityPlatform/member/posts/:postId/votes",
    request: null,
    response: {
      type: "application/json",
      encrypted: false,
    },
  } as const;

  export const path = (props: Props) =>
    `/communityPlatform/member/posts/${encodeURIComponent(props.postId ?? "null")}/votes`;
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
