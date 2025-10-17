import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPortalComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPortalComment";
import type { ICommunityPortalCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPortalCommunity";
import type { ICommunityPortalMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPortalMember";
import type { ICommunityPortalPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPortalPost";
import type { ICommunityPortalSubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPortalSubscription";
import type { ICommunityPortalVote } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPortalVote";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPortalVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPortalVote";

/**
 * Validate that a member can retrieve their own vote history (paginated) and
 * that votes created by the member (post & comment votes) appear in the
 * returned page. The test performs the following steps:
 *
 * 1. Register a new member (POST /auth/member/join) and obtain authentication
 *    information (IAuthorized). The SDK will attach the issued token to the
 *    connection headers automatically.
 * 2. Create a community (POST /communityPortal/member/communities) using the
 *    authenticated member.
 * 3. Subscribe the member to the community when necessary (POST
 *    /communityPortal/member/communities/{communityId}/subscriptions).
 * 4. Create a text post in the community (POST /communityPortal/member/posts).
 * 5. Create a comment under the post (POST
 *    /communityPortal/member/posts/{postId}/comments).
 * 6. Cast a post vote (POST /communityPortal/member/posts/{postId}/votes) and a
 *    comment vote (POST
 *    /communityPortal/member/posts/{postId}/comments/{commentId}/votes).
 * 7. Call PATCH /communityPortal/member/votes with a filter for the authenticated
 *    member (use myItems: true) and pagination params (limit, offset),
 *    requesting sort by createdAt. Validate response shape, pagination meta,
 *    and that the votes created earlier are present in the returned data.
 */
export async function test_api_votes_index_member_own_history(
  connection: api.IConnection,
) {
  // 1. Register a new member
  const memberBody = {
    username: RandomGenerator.paragraph({ sentences: 1 })
      .replace(/\s+/g, "_")
      .toLowerCase(),
    email: typia.random<string & tags.Format<"email">>(),
    password: "P@ssw0rd123",
    display_name: RandomGenerator.name(),
  } satisfies ICommunityPortalMember.ICreate;

  const member: ICommunityPortalMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: memberBody,
    });
  typia.assert(member);

  // 2. Create a community
  const communityBody = {
    name: RandomGenerator.paragraph({ sentences: 3 }),
    is_private: false,
    visibility: "public",
  } satisfies ICommunityPortalCommunity.ICreate;

  const community: ICommunityPortalCommunity =
    await api.functional.communityPortal.member.communities.create(connection, {
      body: communityBody,
    });
  typia.assert(community);

  // 3. Subscribe the member to the community (some installations require it)
  const subscription: ICommunityPortalSubscription =
    await api.functional.communityPortal.member.communities.subscriptions.create(
      connection,
      {
        communityId: community.id,
        body: {
          community_id: community.id,
        } satisfies ICommunityPortalSubscription.ICreate,
      },
    );
  typia.assert(subscription);

  // 4. Create a text post in the community
  const postBody = {
    community_id: community.id,
    post_type: "text",
    title: RandomGenerator.paragraph({ sentences: 3 }),
    body: RandomGenerator.content({ paragraphs: 2 }),
  } satisfies ICommunityPortalPost.ICreate;

  const post: ICommunityPortalPost =
    await api.functional.communityPortal.member.posts.create(connection, {
      body: postBody,
    });
  typia.assert(post);

  // 5. Create a comment under the post
  const commentBody = {
    post_id: post.id,
    parent_comment_id: null,
    body: RandomGenerator.paragraph({ sentences: 6 }),
  } satisfies ICommunityPortalComment.ICreate;

  const comment: ICommunityPortalComment =
    await api.functional.communityPortal.member.posts.comments.create(
      connection,
      {
        postId: post.id,
        body: commentBody,
      },
    );
  typia.assert(comment);

  // 6. Cast a post vote
  const postVoteBody = {
    value: 1,
  } satisfies ICommunityPortalVote.ICreate;

  const postVote: ICommunityPortalVote =
    await api.functional.communityPortal.member.posts.votes.create(connection, {
      postId: post.id,
      body: postVoteBody,
    });
  typia.assert(postVote);

  // 6b. Cast a comment vote
  const commentVoteBody = {
    value: -1,
  } satisfies ICommunityPortalVote.ICreate;

  const commentVote: ICommunityPortalVote =
    await api.functional.communityPortal.member.posts.comments.votes.create(
      connection,
      {
        postId: post.id,
        commentId: comment.id,
        body: commentVoteBody,
      },
    );
  typia.assert(commentVote);

  // 7. Retrieve the authenticated member's vote history (pagination + sorting)
  // Use myItems: true to restrict to the authenticated caller's votes per DTO.
  const request = {
    myItems: true,
    limit: 10,
    offset: 0,
    sort: "createdAt",
  } satisfies ICommunityPortalVote.IRequest;

  const page: IPageICommunityPortalVote.ISummary =
    await api.functional.communityPortal.member.votes.index(connection, {
      body: request,
    });
  typia.assert(page);

  // Validate pagination meta
  TestValidator.equals(
    "pagination limit equals requested",
    page.pagination.limit,
    10,
  );
  // The returned data length should be less than or equal to limit
  TestValidator.predicate(
    "page.data length does not exceed limit",
    page.data.length <= 10,
  );

  // Validate items include created votes
  TestValidator.predicate(
    "response includes post vote",
    page.data.some((v) => v.id === postVote.id),
  );

  TestValidator.predicate(
    "response includes comment vote",
    page.data.some((v) => v.id === commentVote.id),
  );

  // Ensure deleted votes are excluded by default (deleted_at should be null)
  TestValidator.predicate(
    "no deleted votes in page",
    page.data.every((v) => v.deleted_at === null),
  );
}
