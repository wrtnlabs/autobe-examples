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

export async function test_api_comment_downvote_by_different_user(
  connection: api.IConnection,
) {
  // Step 1: Create first user (author of comment)
  const user1JoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "password123",
    username:
      RandomGenerator.name(1).replace(/\s+/g, "_").toLowerCase() + "_user1",
  } satisfies ICommunityForumCommunityUser.IJoin;

  const user1: ICommunityForumCommunityUser.IAuthorized =
    await api.functional.auth.user.join(connection, {
      body: user1JoinBody,
    });
  typia.assert(user1);

  // Step 2: Create community using first user
  const communityBody = {
    name:
      RandomGenerator.name(2).replace(/\s+/g, "-").toLowerCase() + "-community",
    slug: RandomGenerator.name(1).replace(/\s+/g, "-").toLowerCase() + "-slug",
    title: RandomGenerator.paragraph({ sentences: 3, wordMin: 3, wordMax: 8 }),
    description: RandomGenerator.content({
      paragraphs: 1,
      sentenceMin: 5,
      sentenceMax: 10,
    }),
    rules: RandomGenerator.content({
      paragraphs: 1,
      sentenceMin: 3,
      sentenceMax: 5,
    }),
    privacy_level: "public",
    status: "active",
  } satisfies ICommunityForumCommunityGroup.ICreate;

  const community: ICommunityForumCommunityGroup =
    await api.functional.communityForum.user.communities.create(connection, {
      body: communityBody,
    });
  typia.assert(community);

  // Step 3: Create post in the community
  const postBody = {
    community_forum_community_id: community.id,
    title: RandomGenerator.paragraph({ sentences: 4, wordMin: 3, wordMax: 6 }),
    type: "text",
    body: RandomGenerator.content({
      paragraphs: 3,
      sentenceMin: 8,
      sentenceMax: 15,
    }),
  } satisfies ICommunityForumCommunityPost.ICreate;

  const post: ICommunityForumCommunityPost =
    await api.functional.communityForum.user.posts.create(connection, {
      body: postBody,
    });
  typia.assert(post);

  // Step 4: Create comment on the post
  const commentBody = {
    body: RandomGenerator.paragraph({ sentences: 5, wordMin: 4, wordMax: 10 }),
    href: "http://localhost:3000/post/" + post.id,
    referrer: "http://localhost:3000/community/" + community.slug,
  } satisfies ICommunityForumPostComment.ICreate;

  const comment: ICommunityForumPostComment =
    await api.functional.communityForum.user.posts.comments.create(connection, {
      postId: post.id,
      body: commentBody,
    });
  typia.assert(comment);

  // Step 5: Create second user (voter)
  const user2JoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "password123",
    username:
      RandomGenerator.name(1).replace(/\s+/g, "_").toLowerCase() + "_user2",
  } satisfies ICommunityForumCommunityUser.IJoin;

  const user2: ICommunityForumCommunityUser.IAuthorized =
    await api.functional.auth.user.join(connection, {
      body: user2JoinBody,
    });
  typia.assert(user2);

  // Step 6: Second user downvotes the comment
  const voteBody = {
    is_upvote: false,
  } satisfies ICommunityForumPostCommentVote.ICreate;

  const vote: ICommunityForumPostCommentVote =
    await api.functional.communityForum.user.comments.votes.create(connection, {
      commentId: comment.id,
      body: voteBody,
    });
  typia.assert(vote);

  // Validation: Check that the vote was recorded correctly
  TestValidator.equals("vote is a downvote", vote.is_upvote, false);
  TestValidator.equals(
    "vote is linked to correct comment",
    vote.comment.id,
    comment.id,
  );
  TestValidator.equals("vote is from correct user", vote.user.id, user2.id);
}
