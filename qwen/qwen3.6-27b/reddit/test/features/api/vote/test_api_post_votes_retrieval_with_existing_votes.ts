import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditLikeCommunityPostVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditLikeCommunityPostVote";
import type { IREdditLikeCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IREdditLikeCommunityCommunity";
import type { IREdditLikeCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IREdditLikeCommunityMember";
import type { IREdditLikeCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IREdditLikeCommunityPost";
import type { IREdditLikeCommunityProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IREdditLikeCommunityProfile";
import type { IRedditLikeCommunityCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunityCommunitySubscription";
import type { IRedditLikeCommunityPostImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunityPostImage";
import type { IRedditLikeCommunityPostVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunityPostVote";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_like_community_member_communities_create } from "../../../generate/generate_random_reddit_like_community_member_communities_create";
import { generate_random_reddit_like_community_member_community_subscriptions_create } from "../../../generate/generate_random_reddit_like_community_member_community_subscriptions_create";
import { generate_random_reddit_like_community_member_posts_create } from "../../../generate/generate_random_reddit_like_community_member_posts_create";
import { prepare_random_reddit_like_community_community } from "../../../prepare/prepare_random_reddit_like_community_community";
import { prepare_random_reddit_like_community_community_subscription } from "../../../prepare/prepare_random_reddit_like_community_community_subscription";
import { prepare_random_reddit_like_community_post } from "../../../prepare/prepare_random_reddit_like_community_post";

/**
 * Test that an authenticated member can retrieve all vote records for a post that has existing votes.
 *
 * Validates the complete vote retrieval flow including community setup, post creation by the author member, subscription by multiple members, downvote casting by different voters, and vote record retrieval. Ensures that the returned vote list correctly contains vote records from each member who voted, with proper vote direction and metadata.
 *
 * Special attention is given to verifying that multiple votes from different members are all returned in the paginated response, that pagination metadata accurately reflects the actual vote count, and that each vote record contains correct voter identity and direction information.
 *
 * 1. First member (author) joins and creates a community.
 * 2. Author subscribes to the community.
 * 3. Author creates a text post in the community.
 * 4. Second member joins and subscribes to the same community.
 * 5. Second member casts a downvote on the post.
 * 6. Third member joins and subscribes to the community.
 * 7. Third member also casts a downvote on the post.
 * 8. Author retrieves vote records for the post.
 * 9. Validates pagination count matches total votes cast.
 * 10. Validates each vote record's direction and voter identity.
 */
export async function test_api_post_votes_retrieval_with_existing_votes(
  connection: api.IConnection,
): Promise<void> {
  // 1-3. Author member joins, creates community, subscribes, creates post
  const authorConnection: api.IConnection = { host: connection.host };
  const author = await authorize_member_join(authorConnection, { body: {} });
  typia.assert(author);
  const community =
    await generate_random_reddit_like_community_member_communities_create(
      authorConnection,
      {},
    );
  typia.assert(community);
  await generate_random_reddit_like_community_member_community_subscriptions_create(
    authorConnection,
    { body: { community_id: community.id } },
  );
  const post = await generate_random_reddit_like_community_member_posts_create(
    authorConnection,
    { body: { community_id: community.id, post_type: "text" } },
  );
  typia.assert(post);
  // 4-5. Second member joins, subscribes, downvotes
  const secondConnection: api.IConnection = { host: connection.host };
  const secondMember = await authorize_member_join(secondConnection, {
    body: {},
  });
  typia.assert(secondMember);
  await generate_random_reddit_like_community_member_community_subscriptions_create(
    secondConnection,
    { body: { community_id: community.id } },
  );
  const secondVote =
    await api.functional.redditLikeCommunity.member.votes.posts.downvote(
      secondConnection,
      { postId: post.id },
    );
  typia.assert(secondVote);
  // 6-7. Third member joins, subscribes, downvotes
  const thirdConnection: api.IConnection = { host: connection.host };
  const thirdMember = await authorize_member_join(thirdConnection, {
    body: {},
  });
  typia.assert(thirdMember);
  await generate_random_reddit_like_community_member_community_subscriptions_create(
    thirdConnection,
    { body: { community_id: community.id } },
  );
  const thirdVote =
    await api.functional.redditLikeCommunity.member.votes.posts.downvote(
      thirdConnection,
      { postId: post.id },
    );
  typia.assert(thirdVote);
  // 8. Author retrieves vote records
  const votesResponse =
    await api.functional.redditLikeCommunity.member.posts.votes.at(
      authorConnection,
      { postId: post.id },
    );
  typia.assert(votesResponse);
  // 9-10. Validate response
  TestValidator.equals(
    "pagination records matches number of votes",
    votesResponse.pagination.records,
    2,
  );
  TestValidator.equals("data contains 2 votes", votesResponse.data.length, 2);
  TestValidator.predicate(
    "all votes are downvotes",
    votesResponse.data.every((v) => v.direction === "down"),
  );
  TestValidator.predicate(
    "second member vote exists",
    votesResponse.data.some((v) => v.member.id === secondMember.id),
  );
  TestValidator.predicate(
    "third member vote exists",
    votesResponse.data.some((v) => v.member.id === thirdMember.id),
  );
  TestValidator.predicate(
    "all votes have valid timestamps",
    votesResponse.data.every(
      (v) => v.created_at !== undefined && v.updated_at !== undefined,
    ),
  );
}
