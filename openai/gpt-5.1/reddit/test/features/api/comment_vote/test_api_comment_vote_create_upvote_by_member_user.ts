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
 * Validate that an authenticated member user can upvote an existing comment and
 * receive the correct aggregated voting state in the response.
 *
 * Business flow
 *
 * 1. Register a member user (join) so that we have an authenticated memberUser
 *    context and Authorization header configured on the connection.
 * 2. Create a community as that member user using the memberUser
 *    communities.create endpoint.
 * 3. Join that community by creating a membership with role "member".
 * 4. Create a post in the created community.
 * 5. Create a top-level comment on that post.
 * 6. Cast an upvote on the created comment as the same member user.
 * 7. Assert that the returned comment vote aggregate reflects the upvote.
 */
export async function test_api_comment_vote_create_upvote_by_member_user(
  connection: api.IConnection,
) {
  // 1. Register member user and get authenticated context
  const joinBody = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(10),
    ip: null,
    href: "https://community.example.com/signup",
    referrer: "https://community.example.com/landing",
  } satisfies ICommunityPlatformMemberuser.IJoin;

  const memberUser = await api.functional.auth.memberUser.join(connection, {
    body: joinBody,
  });
  typia.assert<ICommunityPlatformMemberuser.IAuthorized>(memberUser);

  // 2. Create a community
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

  const community =
    await api.functional.communityPlatform.memberUser.communities.create(
      connection,
      {
        body: communityBody,
      },
    );
  typia.assert<ICommunityPlatformCommunity>(community);

  // 3. Create a membership in that community for the same member user
  const membershipBody = {
    role: "member",
    isApproved: true,
    isBanned: false,
  } satisfies ICommunityPlatformCommunityMembership.ICreate;

  const membership =
    await api.functional.communityPlatform.memberUser.communities.memberships.create(
      connection,
      {
        communitySlug: community.slug,
        body: membershipBody,
      },
    );
  typia.assert<ICommunityPlatformCommunityMembership>(membership);

  // 4. Create a post in that community
  const postBody = {
    communityId: community.id,
    communityCode: community.slug,
    title: RandomGenerator.paragraph({ sentences: 3 }),
    body: RandomGenerator.paragraph({ sentences: 10 }),
    postType: "text",
  } satisfies ICommunityPlatformPost.ICreate;

  const post = await api.functional.communityPlatform.memberUser.posts.create(
    connection,
    {
      body: postBody,
    },
  );
  typia.assert<ICommunityPlatformPost>(post);

  // 5. Create a top-level comment for the post
  const commentBody = {
    content: RandomGenerator.paragraph({ sentences: 4 }),
  } satisfies ICommunityPlatformComment.ICreate;

  const comment =
    await api.functional.communityPlatform.memberUser.posts.comments.create(
      connection,
      {
        postId: post.id,
        body: commentBody,
      },
    );
  typia.assert<ICommunityPlatformComment>(comment);

  // 6. Upvote the comment
  const voteBody = {
    direction: "up",
  } satisfies ICommunityPlatformCommentVote.ICreate;

  const vote =
    await api.functional.communityPlatform.memberUser.comments.votes.create(
      connection,
      {
        commentId: comment.id,
        body: voteBody,
      },
    );
  typia.assert<ICommunityPlatformCommentVote>(vote);

  // 7. Validate aggregated voting state
  TestValidator.equals(
    "comment_id should match the target comment",
    vote.comment_id,
    comment.id,
  );

  TestValidator.equals(
    "upvotes should be exactly 1 after first upvote",
    vote.upvotes,
    1,
  );

  TestValidator.equals(
    "downvotes should be 0 after first upvote",
    vote.downvotes,
    0,
  );

  TestValidator.equals(
    "score should be +1 after a single upvote",
    vote.score,
    1,
  );

  TestValidator.equals(
    "myVote should reflect the upvote direction",
    vote.myVote,
    "up",
  );
}
