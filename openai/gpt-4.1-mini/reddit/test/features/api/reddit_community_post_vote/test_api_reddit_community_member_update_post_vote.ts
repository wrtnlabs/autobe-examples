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

export async function test_api_reddit_community_member_update_post_vote(
  connection: api.IConnection,
) {
  // 1. Authenticate as a member.
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const member = await api.functional.auth.member.join(connection, {
    body: {
      email: memberEmail,
      password: "password1234",
    } satisfies IRedditCommunityMember.ICreate,
  });
  typia.assert(member);

  // 2. Create a community.
  const communityCreateBody = {
    name: RandomGenerator.alphabets(8),
    description: RandomGenerator.paragraph({
      sentences: 5,
      wordMin: 4,
      wordMax: 8,
    }),
  } satisfies IRedditCommunityCommunity.ICreate;
  const community =
    await api.functional.redditCommunity.member.communities.createCommunity(
      connection,
      {
        body: communityCreateBody,
      },
    );
  typia.assert(community);

  // 3. Create a post to vote on within the created community.
  const postType = "text";
  const postCreateBody = {
    reddit_community_community_id: community.id,
    post_type: postType,
    title: RandomGenerator.paragraph({ sentences: 3, wordMin: 5, wordMax: 10 }),
    body_text: RandomGenerator.content({
      paragraphs: 2,
      sentenceMin: 8,
      sentenceMax: 12,
      wordMin: 3,
      wordMax: 7,
    }),
  } satisfies IRedditCommunityPosts.ICreate;
  const post =
    await api.functional.redditCommunity.member.communities.posts.createPost(
      connection,
      {
        communityId: community.id,
        body: postCreateBody,
      },
    );
  typia.assert(post);

  // 4. Create initial post vote to update.
  const createVoteBody = {
    member_id: member.id,
    post_id: post.id,
    vote_value: 1,
  } satisfies IRedditCommunityPostVote.ICreate;
  const initialPostVote =
    await api.functional.redditCommunity.member.posts.postVotes.createPostVote(
      connection,
      {
        postId: post.id,
        body: createVoteBody,
      },
    );
  typia.assert(initialPostVote);

  // 5. Update the existing post vote with new vote_value.
  const updatedVoteValue = -1; // Changing vote from +1 to -1
  const updateVoteBody = {
    vote_value: updatedVoteValue,
  } satisfies IRedditCommunityPostVote.IUpdate;
  const updatedPostVote =
    await api.functional.redditCommunity.member.posts.postVotes.updatePostVote(
      connection,
      {
        postId: post.id,
        voteId: initialPostVote.id,
        body: updateVoteBody,
      },
    );
  typia.assert(updatedPostVote);

  // 6. Validate that the vote_value was updated successfully.
  TestValidator.equals(
    "updated post vote vote_value matches",
    updatedPostVote.vote_value,
    updatedVoteValue,
  );
}
