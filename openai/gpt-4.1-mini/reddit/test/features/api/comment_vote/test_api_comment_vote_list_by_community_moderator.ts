import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditCommunityCommentVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCommunityCommentVote";
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

export async function test_api_comment_vote_list_by_community_moderator(
  connection: api.IConnection,
) {
  // 1. Register and authenticate communityModerator
  const communityModeratorEmail = typia.random<string & tags.Format<"email">>();
  const communityModerator =
    await api.functional.auth.communityModerator.join.joinCommunityModerator(
      connection,
      {
        body: {
          email: communityModeratorEmail,
          password: "securePass123",
        } satisfies IRedditCommunityCommunityModerator.IJoin,
      },
    );
  typia.assert(communityModerator);

  // 2. Register and authenticate member user
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const member = await api.functional.auth.member.join(connection, {
    body: {
      email: memberEmail,
      password: "memberPass123",
    } satisfies IRedditCommunityMember.ICreate,
  });
  typia.assert(member);

  // 3. Member creates a community
  const communityCreateBody = {
    name: RandomGenerator.name(3)
      .replace(/[^0-9a-zA-Z_]/g, "_")
      .slice(0, 50),
    description: RandomGenerator.paragraph({ sentences: 5 }),
  } satisfies IRedditCommunityCommunity.ICreate;

  const community =
    await api.functional.redditCommunity.member.communities.createCommunity(
      connection,
      { body: communityCreateBody },
    );
  typia.assert(community);
  TestValidator.equals(
    "community name matches create request",
    community.name,
    communityCreateBody.name,
  );

  // 4. Member creates a post in the community
  // Prepare post create body with post_type 'text' fulfilling required fields
  const postCreateBody = {
    reddit_community_community_id: community.id,
    post_type: "text",
    title: RandomGenerator.paragraph({ sentences: 3, wordMin: 5, wordMax: 10 }),
    body_text: RandomGenerator.content({
      paragraphs: 2,
      sentenceMin: 10,
      sentenceMax: 15,
    }),
    author_member_id: null, // Because the server sets it from authenticated user
    author_guest_id: null,
  } satisfies IRedditCommunityPosts.ICreate;

  const post =
    await api.functional.redditCommunity.member.communities.posts.createPost(
      connection,
      { communityId: community.id, body: postCreateBody },
    );
  typia.assert(post);
  TestValidator.equals(
    "post title matches create request",
    post.title,
    postCreateBody.title,
  );

  // 5. Member creates a comment on the post
  const commentCreateBody = {
    reddit_community_post_id: post.id,
    parent_comment_id: null,
    author_member_id: null, // Backend should recognize member
    author_guest_id: null,
    body_text: RandomGenerator.paragraph({
      sentences: 8,
      wordMin: 4,
      wordMax: 8,
    }),
  } satisfies IRedditCommunityComment.ICreate;

  const comment =
    await api.functional.redditCommunity.member.posts.comments.create(
      connection,
      { postId: post.id, body: commentCreateBody },
    );
  typia.assert(comment);
  TestValidator.equals(
    "comment body_text matches create request",
    comment.body_text,
    commentCreateBody.body_text,
  );

  // 6. Member creates a vote on the comment
  const commentVoteCreateBody = {
    member_id: member.id,
    comment_id: comment.id,
    vote_value: 1, // upvote
  } satisfies IRedditCommunityCommentVote.ICreate;

  const commentVote =
    await api.functional.redditCommunity.member.comments.commentVotes.create(
      connection,
      { commentId: comment.id, body: commentVoteCreateBody },
    );
  typia.assert(commentVote);
  TestValidator.equals(
    "comment vote vote_value matches create request",
    commentVote.vote_value,
    commentVoteCreateBody.vote_value,
  );

  // 7. CommunityModerator logs in to simulate role switching explicitly
  await api.functional.auth.communityModerator.login.loginCommunityModerator(
    connection,
    {
      body: {
        email: communityModeratorEmail,
        password: "securePass123",
      } satisfies IRedditCommunityCommunityModerator.ILogin,
    },
  );

  // 8. CommunityModerator queries paginated comment votes for the comment
  const commentVotesQueryBody = {
    page: 1,
    limit: 10,
    sort_by: "created_at",
    order_by: "asc",
  } satisfies IRedditCommunityCommentVote.IRequest;

  const pagedCommentVotes =
    await api.functional.redditCommunity.communityModerator.comments.commentVotes.indexCommentVotes(
      connection,
      { commentId: comment.id, body: commentVotesQueryBody },
    );
  typia.assert(pagedCommentVotes);

  // 9. Validate pagination fields
  TestValidator.predicate(
    "pagination current page is 1",
    pagedCommentVotes.pagination.current === 1,
  );
  TestValidator.predicate(
    "pagination limit is 10",
    pagedCommentVotes.pagination.limit === 10,
  );
  TestValidator.predicate(
    "pagination records count is >= 1",
    pagedCommentVotes.pagination.records >= 1,
  );
  TestValidator.predicate(
    "pagination pages count is >= 1",
    pagedCommentVotes.pagination.pages >= 1,
  );

  // 10. Validate comment votes list correctness
  TestValidator.predicate(
    "comment votes data length is at least 1",
    pagedCommentVotes.data.length >= 1,
  );

  // 11. Check that all returned votes correspond to queried comment ID
  for (const vote of pagedCommentVotes.data) {
    TestValidator.equals(
      "commentId matches queried comment",
      vote.comment_id,
      comment.id,
    );
    // vote_value should be either -1, 0, or 1
    TestValidator.predicate(
      `vote_value ${vote.vote_value} is a valid vote`,
      [-1, 0, 1].includes(vote.vote_value),
    );
  }
}
