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

export async function test_api_comment_vote_retrieve_by_member(
  connection: api.IConnection,
) {
  // 1. Member joins and authenticates
  const memberJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
  } satisfies IRedditCommunityMember.ICreate;

  const member: IRedditCommunityMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: memberJoinBody,
    });
  typia.assert(member);

  // 2. Create a community
  const communityCreateBody = {
    name: RandomGenerator.name(1).replace(/\s+/g, "_").slice(0, 50),
    description: RandomGenerator.paragraph({
      sentences: 5,
      wordMin: 3,
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

  // 3. Create a post in the community
  const postCreateBody = {
    reddit_community_community_id: community.id,
    post_type: "text",
    title: RandomGenerator.paragraph({
      sentences: 3,
      wordMin: 5,
      wordMax: 8,
    }).slice(0, 300),
    body_text: RandomGenerator.content({
      paragraphs: 2,
      sentenceMin: 5,
      sentenceMax: 10,
      wordMin: 3,
      wordMax: 6,
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

  // 4. Create a comment on the post
  const commentCreateBody = {
    reddit_community_post_id: post.id,
    body_text: RandomGenerator.paragraph({
      sentences: 8,
      wordMin: 4,
      wordMax: 10,
    }),
    author_member_id: member.id,
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

  // 5. Create a comment vote by the member
  const validVoteValues = [1, -1, 0] as const;
  const chosenVoteValue = RandomGenerator.pick(validVoteValues);

  const voteCreateBody = {
    member_id: member.id,
    comment_id: comment.id,
    vote_value: chosenVoteValue,
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

  // 6. Retrieve the specific comment vote
  const voteFetched: IRedditCommunityCommentVote =
    await api.functional.redditCommunity.member.comments.commentVotes.at(
      connection,
      {
        commentId: comment.id,
        voteId: vote.id,
      },
    );
  typia.assert(voteFetched);

  // 7. Validate fetched vote matches created vote
  TestValidator.equals("comment vote ID matches", voteFetched.id, vote.id);
  TestValidator.equals(
    "comment vote member ID matches",
    voteFetched.member_id,
    vote.member_id,
  );
  TestValidator.equals(
    "comment vote comment ID matches",
    voteFetched.comment_id,
    vote.comment_id,
  );
  TestValidator.equals(
    "comment vote value matches",
    voteFetched.vote_value,
    vote.vote_value,
  );
  TestValidator.equals(
    "comment vote created_at matches",
    voteFetched.created_at,
    vote.created_at,
  );
  TestValidator.equals(
    "comment vote updated_at matches",
    voteFetched.updated_at,
    vote.updated_at,
  );
  TestValidator.equals(
    "comment vote deleted_at matches",
    voteFetched.deleted_at ?? null,
    vote.deleted_at ?? null,
  );
}
