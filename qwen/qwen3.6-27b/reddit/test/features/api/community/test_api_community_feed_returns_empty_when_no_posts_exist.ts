import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditLikeCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditLikeCommunityPost";
import type { IREdditLikeCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IREdditLikeCommunityCommunity";
import type { IREdditLikeCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IREdditLikeCommunityMember";
import type { IREdditLikeCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IREdditLikeCommunityPost";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_like_community_member_communities_create } from "../../../generate/generate_random_reddit_like_community_member_communities_create";
import { prepare_random_reddit_like_community_community } from "../../../prepare/prepare_random_reddit_like_community_community";

/**
 * Validates that the community feed endpoint returns an empty paginated result when a newly created community has no posts.
 *
 * A member registers and creates a community without publishing any posts. The feed endpoint is then queried for that community. The response must return a paginated result with zero total records, zero total pages, and an empty data array.
 *
 * This test ensures graceful handling of empty communities, confirming that the feed endpoint does not error or return stale data when a community has zero posts, as specified in the Section 153 rule about zero subscriber community visibility.
 *
 * 1. Member registers with email, password, and username.
 * 2. Member creates a community with a unique name and description.
 * 3. Feed is requested for the community using an empty request body.
 * 4. Validates that pagination shows zero records and zero pages, and the data array is empty.
 */
export async function test_api_community_feed_returns_empty_when_no_posts_exist(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate member
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {},
  });
  // 2. Create a community with no posts
  const community =
    await generate_random_reddit_like_community_member_communities_create(
      memberConnection,
      {},
    );
  typia.assert(community);
  // 3. Request the feed for the empty community
  const feed = await api.functional.redditLikeCommunity.communities.feeds.index(
    memberConnection,
    {
      communityId: community.id,
      body: {} satisfies IREdditLikeCommunityPost.IRequest,
    },
  );
  typia.assert(feed);
  // 4. Validate empty feed response
  TestValidator.equals("data array is empty", feed.data, []);
  TestValidator.equals("zero total records", feed.pagination.records, 0);
  TestValidator.equals("zero total pages", feed.pagination.pages, 0);
}
