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

export async function test_api_post_vote_update_by_member(
  connection: api.IConnection,
) {
  // Step 1: Member user joins (authenticates) to obtain auth token and ID
  const member: IRedditCommunityMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: RandomGenerator.alphaNumeric(7) + "@email.com",
        password: "ValidPass123!",
      } satisfies IRedditCommunityMember.ICreate,
    });
  typia.assert(member);

  // Step 2: Create a new community as this member
  const communityCreateBody: IRedditCommunityCommunity.ICreate = {
    name: RandomGenerator.alphaNumeric(5),
    description: RandomGenerator.paragraph({ sentences: 3 }),
  };
  const community: IRedditCommunityCommunity =
    await api.functional.redditCommunity.member.communities.createCommunity(
      connection,
      {
        body: communityCreateBody,
      },
    );
  typia.assert(community);

  // Step 3: Create a post within the created community
  const postCreateBody: IRedditCommunityPosts.ICreate = {
    reddit_community_community_id: community.id,
    post_type: "text",
    title: RandomGenerator.paragraph({ sentences: 5, wordMin: 4, wordMax: 8 }),
    body_text: RandomGenerator.content({ paragraphs: 2 }),
  };
  const post: IRedditCommunityPosts =
    await api.functional.redditCommunity.member.communities.posts.createPost(
      connection,
      {
        communityId: community.id,
        body: postCreateBody,
      },
    );
  typia.assert(post);

  // Step 4: Member casts an initial vote on the post
  const initialVoteCreateBody: IRedditCommunityPostVote.ICreate = {
    member_id: member.id,
    post_id: post.id,
    vote_value: 1, // upvote
  };
  const postVote: IRedditCommunityPostVote =
    await api.functional.redditCommunity.member.posts.postVotes.createPostVote(
      connection,
      {
        postId: post.id,
        body: initialVoteCreateBody,
      },
    );
  typia.assert(postVote);

  // Step 5: Update the vote value to a downvote (-1) via the update endpoint
  const voteUpdateBody: IRedditCommunityPostVote.IUpdate = {
    vote_value: -1,
  };
  const updatedVote: IRedditCommunityPostVote =
    await api.functional.redditCommunity.member.posts.postVotes.updatePostVote(
      connection,
      {
        postId: post.id,
        voteId: postVote.id,
        body: voteUpdateBody,
      },
    );
  typia.assert(updatedVote);

  // Step 6: Validate the vote record was updated properly
  TestValidator.equals(
    "vote ID remains unchanged after update",
    updatedVote.id,
    postVote.id,
  );
  TestValidator.equals(
    "vote member ID remains unchanged after update",
    updatedVote.member_id,
    postVote.member_id,
  );
  TestValidator.equals(
    "vote post ID remains unchanged after update",
    updatedVote.post_id,
    postVote.post_id,
  );
  TestValidator.equals(
    "vote value updates to -1",
    updatedVote.vote_value,
    voteUpdateBody.vote_value,
  );
  TestValidator.predicate(
    "updatedAt is modified on update",
    new Date(updatedVote.updated_at).getTime() >=
      new Date(postVote.updated_at).getTime(),
  );
}
