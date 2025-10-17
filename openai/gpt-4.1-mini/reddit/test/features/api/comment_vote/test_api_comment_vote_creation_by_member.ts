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

export async function test_api_comment_vote_creation_by_member(
  connection: api.IConnection,
) {
  // 1. Member joins (registers) to authenticate
  const memberCreateBody = {
    email: `member${RandomGenerator.alphaNumeric(8)}@example.com`,
    password: "StrongPass!123",
  } satisfies IRedditCommunityMember.ICreate;
  const member: IRedditCommunityMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: memberCreateBody,
    });
  typia.assert(member);

  // 2. Member creates a new community
  const communityCreateBody = {
    name: `com_${RandomGenerator.alphaNumeric(8)}`,
    description: RandomGenerator.paragraph({
      sentences: 3,
      wordMin: 4,
      wordMax: 8,
    }),
  } satisfies IRedditCommunityCommunity.ICreate;
  const community: IRedditCommunityCommunity =
    await api.functional.redditCommunity.member.communities.createCommunity(
      connection,
      {
        body: communityCreateBody,
      },
    );
  typia.assert(community);

  // 3. Member creates a new post inside the community
  const postCreateBody = {
    reddit_community_community_id: community.id,
    post_type: "text",
    title: RandomGenerator.paragraph({ sentences: 5, wordMin: 5, wordMax: 10 }),
    body_text: RandomGenerator.content({
      paragraphs: 2,
      sentenceMin: 10,
      sentenceMax: 15,
      wordMin: 3,
      wordMax: 7,
    }),
  } satisfies IRedditCommunityPosts.ICreate;
  const post: IRedditCommunityPosts =
    await api.functional.redditCommunity.member.communities.posts.createPost(
      connection,
      {
        communityId: community.id,
        body: postCreateBody,
      },
    );
  typia.assert(post);

  // 4. Member creates a comment on the newly created post
  const commentCreateBody = {
    reddit_community_post_id: post.id,
    body_text: RandomGenerator.paragraph({
      sentences: 4,
      wordMin: 4,
      wordMax: 9,
    }),
  } satisfies IRedditCommunityComment.ICreate;
  const comment: IRedditCommunityComment =
    await api.functional.redditCommunity.member.posts.comments.create(
      connection,
      {
        postId: post.id,
        body: commentCreateBody,
      },
    );
  typia.assert(comment);

  // 5. Member creates a vote on the comment (upvote)
  const voteCreateBody = {
    member_id: member.id,
    comment_id: comment.id,
    vote_value: 1,
  } satisfies IRedditCommunityCommentVote.ICreate;
  const vote: IRedditCommunityCommentVote =
    await api.functional.redditCommunity.member.comments.commentVotes.create(
      connection,
      {
        commentId: comment.id,
        body: voteCreateBody,
      },
    );
  typia.assert(vote);

  // 6. Validate the created vote
  TestValidator.equals(
    "vote member_id should match",
    vote.member_id,
    member.id,
  );
  TestValidator.equals(
    "vote comment_id should match",
    vote.comment_id,
    comment.id,
  );
  TestValidator.equals("vote_value should be 1 (upvote)", vote.vote_value, 1);
  TestValidator.predicate(
    "created_at should be ISO date-time",
    typeof vote.created_at === "string" && vote.created_at.length > 0,
  );
  TestValidator.predicate(
    "updated_at should be ISO date-time",
    typeof vote.updated_at === "string" && vote.updated_at.length > 0,
  );
}
