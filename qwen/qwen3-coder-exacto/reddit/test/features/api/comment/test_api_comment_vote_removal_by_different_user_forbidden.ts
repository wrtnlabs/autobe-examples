import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityForumAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityForumAuthorizationToken";
import type { ICommunityForumCommunityGroup } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityForumCommunityGroup";
import type { ICommunityForumCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityForumCommunityPost";
import type { ICommunityForumCommunityUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityForumCommunityUser";
import type { ICommunityForumPostComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityForumPostComment";
import type { ICommunityForumPostCommentVote } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityForumPostCommentVote";

export async function test_api_comment_vote_removal_by_different_user_forbidden(
  connection: api.IConnection,
) {
  // Step 1: Create first user (post author)
  const user1Join = {
    email: `${RandomGenerator.alphabets(10)}@test.com`,
    password: "password123",
    username: RandomGenerator.name(1).toLowerCase().replace(/\s+/g, "_"),
  } satisfies ICommunityForumCommunityUser.IJoin;

  const postAuthor: ICommunityForumCommunityUser.IAuthorized =
    await api.functional.auth.user.join(connection, {
      body: user1Join,
    });
  typia.assert(postAuthor);

  // Step 2: Create a community
  const communityBody = {
    name: RandomGenerator.name(2).toLowerCase().replace(/\s+/g, "-"),
    slug: RandomGenerator.name(1).toLowerCase().replace(/\s+/g, "-"),
    title: RandomGenerator.name(3),
    description: RandomGenerator.paragraph({ sentences: 5 }),
    rules: RandomGenerator.paragraph({ sentences: 3 }),
    privacy_level: "public",
    status: "active",
  } satisfies ICommunityForumCommunityGroup.ICreate;

  const community: ICommunityForumCommunityGroup =
    await api.functional.communityForum.user.communities.create(connection, {
      body: communityBody,
    });
  typia.assert(community);

  // Step 3: Create a post
  const postBody = {
    community_forum_community_id: community.id,
    title: RandomGenerator.name(4),
    type: "text",
    body: RandomGenerator.paragraph({ sentences: 10 }),
  } satisfies ICommunityForumCommunityPost.ICreate;

  const post: ICommunityForumCommunityPost =
    await api.functional.communityForum.user.posts.create(connection, {
      body: postBody,
    });
  typia.assert(post);

  // Step 4: Create a comment
  const commentBody = {
    body: RandomGenerator.paragraph({ sentences: 5 }),
    href: "http://localhost/test",
    referrer: "http://localhost/",
  } satisfies ICommunityForumPostComment.ICreate;

  const comment: ICommunityForumPostComment =
    await api.functional.communityForum.user.posts.comments.create(connection, {
      postId: post.id,
      body: commentBody,
    });
  typia.assert(comment);

  // Step 5: Create second user (voter)
  const user2Join = {
    email: `${RandomGenerator.alphabets(10)}@test.com`,
    password: "password123",
    username: RandomGenerator.name(1).toLowerCase().replace(/\s+/g, "_"),
  } satisfies ICommunityForumCommunityUser.IJoin;

  const voter: ICommunityForumCommunityUser.IAuthorized =
    await api.functional.auth.user.join(connection, {
      body: user2Join,
    });
  typia.assert(voter);

  // Step 6: Create a vote on the comment by the second user
  const voteBody = {
    is_upvote: true,
  } satisfies ICommunityForumPostCommentVote.ICreate;

  const vote: ICommunityForumPostCommentVote =
    await api.functional.communityForum.user.comments.votes.create(connection, {
      commentId: comment.id,
      body: voteBody,
    });
  typia.assert(vote);

  // Step 7: Create third user (attempting to delete the vote)
  const user3Join = {
    email: `${RandomGenerator.alphabets(10)}@test.com`,
    password: "password123",
    username: RandomGenerator.name(1).toLowerCase().replace(/\s+/g, "_"),
  } satisfies ICommunityForumCommunityUser.IJoin;

  const unauthorizedUser: ICommunityForumCommunityUser.IAuthorized =
    await api.functional.auth.user.join(connection, {
      body: user3Join,
    });
  typia.assert(unauthorizedUser);

  // Step 8: Attempt to delete the vote as the third user (should fail)
  await TestValidator.httpError(
    "should fail to delete another user's vote",
    403,
    async () => {
      await api.functional.communityForum.user.comments.votes.erase(
        connection,
        {
          commentId: comment.id,
          voteId: vote.id,
        },
      );
    },
  );
}
