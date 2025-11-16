import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import type { ICommunityPlatformCommentVote } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommentVote";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunityMembership } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityMembership";
import type { ICommunityPlatformMemberuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberuser";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";

/**
 * Validate aggregated comment voting state for a single member user's upvote.
 *
 * Business flow:
 *
 * 1. Register a new memberUser to obtain an authenticated context.
 * 2. Create a community owned by that memberUser.
 * 3. Create a membership for the same memberUser in that community.
 * 4. Create a post in the community.
 * 5. Create a single comment on the post.
 * 6. Cast an "up" vote on the comment as the same memberUser.
 * 7. Read aggregated votes for the comment via the public GET endpoint.
 *
 * Validations:
 *
 * - Response structure matches ICommunityPlatformCommentVote.
 * - Comment_id equals the target comment.id.
 * - Upvotes === 1, downvotes === 0, score === 1.
 * - MyVote === "up" for the authenticated memberUser who cast the vote.
 */
export async function test_api_comment_vote_aggregation_for_single_member_user(
  connection: api.IConnection,
) {
  // 1. Register memberUser (join)
  const joinBody = {
    username: RandomGenerator.alphabets(8),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    ip: null,
    href: "https://example.com/signup",
    referrer: "https://example.com/landing",
  } satisfies ICommunityPlatformMemberuser.IJoin;

  const member: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: joinBody,
    });
  typia.assert(member);

  // 2. Create community
  const communityBody = {
    slug: RandomGenerator.alphaNumeric(12),
    name: RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.paragraph({ sentences: 5 }),
    visibility: "public",
    status: "active",
    is_nsfw: false,
    is_quarantined: false,
    is_posting_restricted: false,
    allow_text_posts: true,
    allow_link_posts: true,
    allow_image_posts: true,
  } satisfies ICommunityPlatformCommunity.ICreate;

  const community: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.memberUser.communities.create(
      connection,
      { body: communityBody },
    );
  typia.assert(community);

  // 3. Create membership for the same memberUser in this community
  const membershipBody = {
    role: "member",
    isApproved: true,
    isBanned: false,
  } satisfies ICommunityPlatformCommunityMembership.ICreate;

  const membership: ICommunityPlatformCommunityMembership =
    await api.functional.communityPlatform.memberUser.communities.memberships.create(
      connection,
      {
        communitySlug: community.slug,
        body: membershipBody,
      },
    );
  typia.assert(membership);

  TestValidator.equals(
    "membership community slug should match created community",
    membership.community.slug,
    community.slug,
  );

  TestValidator.equals(
    "membership member id should match joined member",
    membership.memberUser.id,
    member.id,
  );

  // 4. Create post in the community
  const postBody = {
    communityId: community.id,
    communityCode: community.slug,
    title: RandomGenerator.paragraph({ sentences: 3 }),
    body: RandomGenerator.paragraph({ sentences: 8 }),
    url: undefined,
    postType: "text",
  } satisfies ICommunityPlatformPost.ICreate;

  const post: ICommunityPlatformPost =
    await api.functional.communityPlatform.memberUser.posts.create(connection, {
      body: postBody,
    });
  typia.assert(post);

  TestValidator.equals(
    "post community id should match created community",
    post.community_id,
    community.id,
  );

  // 5. Create a single comment
  const commentBody = {
    content: RandomGenerator.paragraph({ sentences: 4 }),
    parentCommentId: undefined,
  } satisfies ICommunityPlatformComment.ICreate;

  const comment: ICommunityPlatformComment =
    await api.functional.communityPlatform.memberUser.posts.comments.create(
      connection,
      {
        postId: post.id,
        body: commentBody,
      },
    );
  typia.assert(comment);

  TestValidator.equals(
    "comment post id in summary should match post.id",
    comment.post.id,
    post.id,
  );

  // 6. Cast an upvote on the comment as the same memberUser
  const voteBody = {
    direction: "up",
  } satisfies ICommunityPlatformCommentVote.ICreate;

  const voteAggregateAfterCreate: ICommunityPlatformCommentVote =
    await api.functional.communityPlatform.memberUser.comments.votes.create(
      connection,
      {
        commentId: comment.id,
        body: voteBody,
      },
    );
  typia.assert(voteAggregateAfterCreate);

  TestValidator.equals(
    "aggregate after create: comment_id should match comment.id",
    voteAggregateAfterCreate.comment_id,
    comment.id,
  );

  // 7. Retrieve aggregated voting state via GET endpoint (authenticated)
  const aggregate: ICommunityPlatformCommentVote =
    await api.functional.communityPlatform.comments.votes.at(connection, {
      commentId: comment.id,
    });
  typia.assert(aggregate);

  // Business assertions on aggregation
  TestValidator.equals(
    "aggregated comment_id should match comment.id",
    aggregate.comment_id,
    comment.id,
  );

  TestValidator.equals("aggregated upvotes should be 1", aggregate.upvotes, 1);

  TestValidator.equals(
    "aggregated downvotes should be 0",
    aggregate.downvotes,
    0,
  );

  TestValidator.equals(
    "aggregated score should be upvotes - downvotes = 1",
    aggregate.score,
    1,
  );

  TestValidator.equals(
    "myVote should be 'up' for the voting member user",
    aggregate.myVote,
    "up",
  );
}
