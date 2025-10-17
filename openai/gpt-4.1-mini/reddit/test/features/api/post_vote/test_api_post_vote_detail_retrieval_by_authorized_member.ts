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
 * This test covers vote detail retrieval on a RedditCommunity post by an
 * authorized member.
 *
 * Steps:
 *
 * 1. Register a new member and authenticate.
 * 2. Create a new community with a unique name.
 * 3. Create a post in the community.
 * 4. Vote on the post with an upvote (+1).
 * 5. Retrieve the vote detail using the post ID and vote ID.
 * 6. Validate all response fields and proper authorization.
 */
export async function test_api_post_vote_detail_retrieval_by_authorized_member(
  connection: api.IConnection,
) {
  // 1. Register and authenticate a new member user.
  const memberJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
  } satisfies IRedditCommunityMember.ICreate;

  const member: IRedditCommunityMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: memberJoinBody,
    });
  typia.assert(member);

  // 2. Create a new community with unique name.
  const communityCreationBody = {
    name: RandomGenerator.alphabets(8),
    description: RandomGenerator.paragraph({ sentences: 5 }),
  } satisfies IRedditCommunityCommunity.ICreate;

  const community: IRedditCommunityCommunity =
    await api.functional.redditCommunity.member.communities.createCommunity(
      connection,
      { body: communityCreationBody },
    );
  typia.assert(community);

  // 3. Create a new post in the community.
  const postCreationBody = {
    reddit_community_community_id: community.id,
    post_type: "text",
    title: RandomGenerator.paragraph({ sentences: 4, wordMin: 5, wordMax: 8 }),
    body_text: RandomGenerator.content({ paragraphs: 3 }),
  } satisfies IRedditCommunityPosts.ICreate;

  const post: IRedditCommunityPosts =
    await api.functional.redditCommunity.member.communities.posts.createPost(
      connection,
      {
        communityId: community.id,
        body: postCreationBody,
      },
    );
  typia.assert(post);

  // 4. Create a vote on the post by the member.
  const postVoteCreationBody = {
    member_id: member.id,
    post_id: post.id,
    vote_value: +1,
  } satisfies IRedditCommunityPostVote.ICreate;

  const postVote: IRedditCommunityPostVote =
    await api.functional.redditCommunity.member.posts.postVotes.createPostVote(
      connection,
      {
        postId: post.id,
        body: postVoteCreationBody,
      },
    );
  typia.assert(postVote);

  // 5. Retrieve vote details by post ID and vote ID.
  const postVoteDetail: IRedditCommunityPostVote =
    await api.functional.redditCommunity.member.posts.postVotes.at(connection, {
      postId: post.id,
      voteId: postVote.id,
    });
  typia.assert(postVoteDetail);

  // 6. Assertions to validate correct and consistent data.
  TestValidator.equals(
    "Member ID matches the vote member_id",
    postVoteDetail.member_id,
    member.id,
  );
  TestValidator.equals(
    "Post ID matches the vote post_id",
    postVoteDetail.post_id,
    post.id,
  );
  TestValidator.equals(
    "Vote ID matches retrieved vote ID",
    postVoteDetail.id,
    postVote.id,
  );
  TestValidator.equals(
    "Vote value is +1 (upvote)",
    postVoteDetail.vote_value,
    +1,
  );
  TestValidator.predicate(
    "Vote created_at is a valid ISO date-time",
    typeof postVoteDetail.created_at === "string" &&
      !Number.isNaN(Date.parse(postVoteDetail.created_at)),
  );
  TestValidator.predicate(
    "Vote updated_at is a valid ISO date-time",
    typeof postVoteDetail.updated_at === "string" &&
      !Number.isNaN(Date.parse(postVoteDetail.updated_at)),
  );
}
