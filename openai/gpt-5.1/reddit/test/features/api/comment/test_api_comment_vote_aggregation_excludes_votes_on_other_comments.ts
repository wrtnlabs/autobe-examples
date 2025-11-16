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

export async function test_api_comment_vote_aggregation_excludes_votes_on_other_comments(
  connection: api.IConnection,
) {
  // 1. Register a new member user who will own the community, post, and comments.
  const joinBody = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    ip: null,
    href: "https://example.com/join",
    referrer: "https://example.com/landing",
  } satisfies ICommunityPlatformMemberuser.IJoin;

  const memberUser: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: joinBody,
    });
  typia.assert(memberUser);

  // 2. Create a community as this memberUser.
  const communityBody = {
    slug: RandomGenerator.alphaNumeric(10),
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

  // 3. Create a membership for this member user in the community.
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

  // 4. Create a post in the community.
  const postBody = {
    communityId: community.id,
    communityCode: community.slug,
    title: RandomGenerator.paragraph({ sentences: 3 }),
    body: RandomGenerator.paragraph({ sentences: 10 }),
    url: undefined,
    postType: "text",
  } satisfies ICommunityPlatformPost.ICreate;

  const post: ICommunityPlatformPost =
    await api.functional.communityPlatform.memberUser.posts.create(connection, {
      body: postBody,
    });
  typia.assert(post);

  // 5. Create comment A on the post.
  const commentABody = {
    content: RandomGenerator.paragraph({ sentences: 4 }),
    parentCommentId: undefined,
  } satisfies ICommunityPlatformComment.ICreate;

  const commentA: ICommunityPlatformComment =
    await api.functional.communityPlatform.memberUser.posts.comments.create(
      connection,
      {
        postId: post.id,
        body: commentABody,
      },
    );
  typia.assert(commentA);

  // 6. Create comment B on the same post.
  const commentBBody = {
    content: RandomGenerator.paragraph({ sentences: 4 }),
    parentCommentId: undefined,
  } satisfies ICommunityPlatformComment.ICreate;

  const commentB: ICommunityPlatformComment =
    await api.functional.communityPlatform.memberUser.posts.comments.create(
      connection,
      {
        postId: post.id,
        body: commentBBody,
      },
    );
  typia.assert(commentB);

  // 7. Cast a vote on comment A only.
  const voteOnARequest = {
    direction: "up",
  } satisfies ICommunityPlatformCommentVote.ICreate;

  const voteOnA: ICommunityPlatformCommentVote =
    await api.functional.communityPlatform.memberUser.comments.votes.create(
      connection,
      {
        commentId: commentA.id,
        body: voteOnARequest,
      },
    );
  typia.assert(voteOnA);

  // 8. Do NOT cast any vote on comment B.

  // 9. Fetch aggregated voting state for comment B.
  const commentBVotes: ICommunityPlatformCommentVote =
    await api.functional.communityPlatform.comments.votes.at(connection, {
      commentId: commentB.id,
    });
  typia.assert(commentBVotes);

  // 10. Assertions: comment B aggregation must be unaffected by votes on comment A.
  TestValidator.equals(
    "comment B votes should have 0 upvotes",
    commentBVotes.upvotes,
    0,
  );
  TestValidator.equals(
    "comment B votes should have 0 downvotes",
    commentBVotes.downvotes,
    0,
  );
  TestValidator.equals(
    "comment B votes should have 0 score",
    commentBVotes.score,
    0,
  );
  TestValidator.equals(
    "comment B aggregation comment_id matches comment B id",
    commentBVotes.comment_id,
    commentB.id,
  );
}
