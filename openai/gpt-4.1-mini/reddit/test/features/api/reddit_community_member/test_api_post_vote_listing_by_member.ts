import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditCommunityPostVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCommunityPostVote";
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

export async function test_api_post_vote_listing_by_member(
  connection: api.IConnection,
) {
  // 1. Member joins and receives authorization token
  const memberCreateBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(8),
  } satisfies IRedditCommunityMember.ICreate;

  const member: IRedditCommunityMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: memberCreateBody,
    });
  typia.assert(member);

  // 2. Member creates a new community
  // The name must be unique and represent a realistic community name
  const communityCreateBody = {
    name: `voteCommunity_${RandomGenerator.alphaNumeric(6)}`,
    description: RandomGenerator.paragraph({
      sentences: 4,
      wordMin: 5,
      wordMax: 8,
    }),
  } satisfies IRedditCommunityCommunity.ICreate;

  const community: IRedditCommunityCommunity =
    await api.functional.redditCommunity.member.communities.createCommunity(
      connection,
      { body: communityCreateBody },
    );
  typia.assert(community);

  // 3. Member creates a text post in the community
  const postCreateBody = {
    reddit_community_community_id: community.id,
    post_type: "text",
    title: "Vote Test Post",
    body_text: "Body for vote listing test.",
  } satisfies IRedditCommunityPosts.ICreate;

  const post: IRedditCommunityPosts =
    await api.functional.redditCommunity.member.communities.posts.createPost(
      connection,
      { communityId: community.id, body: postCreateBody },
    );
  typia.assert(post);

  // 4. Member lists votes on the post with pagination and filters
  // Setup a typical pagination and filter request (with default pagination)
  const voteListRequestBody = {
    page: 1, // First page
    limit: 10, // Ten votes per page
    deleted_at: null, // Only active votes
  } satisfies IRedditCommunityPostVote.IRequest;

  const votesPage: IPageIRedditCommunityPostVote.ISummary =
    await api.functional.redditCommunity.member.posts.postVotes.index(
      connection,
      {
        postId: post.id,
        body: voteListRequestBody,
      },
    );
  typia.assert(votesPage);

  // Validate the pagination properties
  TestValidator.predicate(
    "The current page index should be 1",
    votesPage.pagination.current === 1,
  );
  TestValidator.predicate(
    "The page limit should be 10",
    votesPage.pagination.limit === 10,
  );
  TestValidator.predicate(
    "The total number of pages must be positive or zero",
    votesPage.pagination.pages >= 0,
  );
  TestValidator.predicate(
    "The total records count should be non-negative",
    votesPage.pagination.records >= 0,
  );

  // Ensure each vote summary is valid for this post
  for (const vote of votesPage.data) {
    TestValidator.equals(
      "Vote summary post_id matches the queried post id",
      vote.post_id,
      post.id,
    );
    TestValidator.predicate(
      "Vote value is one of +1, -1, 0",
      vote.vote_value === 1 || vote.vote_value === -1 || vote.vote_value === 0,
    );
  }
}
