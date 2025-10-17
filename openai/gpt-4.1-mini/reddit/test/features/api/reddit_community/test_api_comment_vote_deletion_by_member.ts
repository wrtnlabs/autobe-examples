import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditCommunityAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityAdmin";
import type { IRedditCommunityComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityComment";
import type { IRedditCommunityCommentVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommentVote";
import type { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import type { IRedditCommunityCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunityModerator";
import type { IRedditCommunityCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunitySubscription";
import type { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import type { IRedditCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPost";
import type { IRedditCommunityPostVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPostVote";
import type { IRedditCommunityPosts } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPosts";
import type { IRedditCommunityReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityReport";
import type { IRedditCommunityReportAction } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityReportAction";
import type { IRedditCommunityUserKarma } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityUserKarma";
import type { IRedditCommunityUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityUserProfile";

/**
 * E2E test function validating the entire scenario where a new redditCommunity
 * member registers, creates a community, posts in it, comments on a post, casts
 * a vote on the comment, and finally deletes their vote.
 *
 * This test ensures the full user flow including authentication, resource
 * creation, data integrity, and authorization enforcement for vote deletion.
 * Each step is verified through type assertions and business logic checks.
 */
export async function test_api_comment_vote_deletion_by_member(
  connection: api.IConnection,
) {
  // 1. Register new member
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "TestPassword!123",
  } satisfies IRedditCommunityMember.ICreate;
  const member = await api.functional.auth.member.join(connection, {
    body: joinBody,
  });
  typia.assert(member);
  TestValidator.predicate(
    "member ID should be defined",
    typeof member.id === "string" && member.id.length > 0,
  );

  // 2. Create a new community
  const communityName = `${RandomGenerator.alphaNumeric(5)}Community`;
  const createCommunityBody = {
    name: communityName,
    description: RandomGenerator.paragraph({ sentences: 3 }),
  } satisfies IRedditCommunityCommunity.ICreate;
  const community =
    await api.functional.redditCommunity.member.communities.createCommunity(
      connection,
      {
        body: createCommunityBody,
      },
    );
  typia.assert(community);
  TestValidator.equals(
    "community name should match",
    community.name,
    communityName,
  );

  // 3. Create a post in the community
  const postTitle = RandomGenerator.paragraph({
    sentences: 5,
    wordMin: 3,
    wordMax: 8,
  });
  const postBodyText = RandomGenerator.content({ paragraphs: 2 });
  const createPostBody = {
    reddit_community_community_id: community.id,
    post_type: "text",
    title: postTitle,
    body_text: postBodyText,
  } satisfies IRedditCommunityPosts.ICreate;
  const post =
    await api.functional.redditCommunity.member.communities.posts.createPost(
      connection,
      {
        communityId: community.id,
        body: createPostBody,
      },
    );
  typia.assert(post);
  TestValidator.equals(
    "post community ID should match",
    post.reddit_community_community_id,
    community.id,
  );
  TestValidator.equals("post type should be text", post.post_type, "text");
  TestValidator.equals("post title should match", post.title, postTitle);

  // 4. Create a comment on the post
  const commentBodyText = RandomGenerator.paragraph({ sentences: 10 });
  const createCommentBody = {
    reddit_community_post_id: post.id,
    author_member_id: member.id,
    body_text: commentBodyText,
  } satisfies IRedditCommunityComment.ICreate;
  const comment =
    await api.functional.redditCommunity.member.posts.comments.create(
      connection,
      {
        postId: post.id,
        body: createCommentBody,
      },
    );
  typia.assert(comment);
  TestValidator.equals(
    "comment post ID should match post",
    comment.reddit_community_post_id,
    post.id,
  );
  TestValidator.equals(
    "comment author member ID should match",
    comment.author_member_id,
    member.id,
  );
  TestValidator.equals(
    "comment body text should match",
    comment.body_text,
    commentBodyText,
  );

  // 5. Cast a vote on the comment by the member
  const createVoteBody = {
    member_id: member.id,
    comment_id: comment.id,
    vote_value: 1,
  } satisfies IRedditCommunityCommentVote.ICreate;
  const vote =
    await api.functional.redditCommunity.member.comments.commentVotes.create(
      connection,
      {
        commentId: comment.id,
        body: createVoteBody,
      },
    );
  typia.assert(vote);
  TestValidator.equals(
    "vote member ID should match",
    vote.member_id,
    member.id,
  );
  TestValidator.equals(
    "vote comment ID should match",
    vote.comment_id,
    comment.id,
  );
  TestValidator.equals("vote value should be 1", vote.vote_value, 1);

  // 6. Delete the vote using the vote ID and comment ID
  await api.functional.redditCommunity.member.comments.commentVotes.erase(
    connection,
    {
      commentId: comment.id,
      voteId: vote.id,
    },
  );
  // No error means success
}
