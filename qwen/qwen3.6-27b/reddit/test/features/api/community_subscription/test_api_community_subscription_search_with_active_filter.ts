import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditLikeCommunityCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditLikeCommunityCommunitySubscription";
import type { IREdditLikeCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IREdditLikeCommunityCommunity";
import type { IREdditLikeCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IREdditLikeCommunityMember";
import type { IRedditLikeCommunityCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunityCommunitySubscription";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_like_community_member_community_subscriptions_create } from "../../../generate/generate_random_reddit_like_community_member_community_subscriptions_create";
import { prepare_random_reddit_like_community_community_subscription } from "../../../prepare/prepare_random_reddit_like_community_community_subscription";

/**
 * Test searching community subscriptions filtered by active status.
 *
 * Validates that the community subscription search endpoint correctly filters by active status and returns paginated results with proper JOIN data. A member is authenticated, a subscription is created, and then the search is performed with the isActive filter.
 *
 * The test verifies that active subscriptions are returned with complete member and community summary data, and that pagination metadata accurately reflects the result count.
 *
 * 1. Authenticate a new member on the platform.
 * 2. Create a community subscription for the authenticated member.
 * 3. Search for active community subscriptions using the isActive filter.
 * 4. Validate that the search result contains the created subscription.
 * 5. Verify the subscription includes proper JOIN data for member and community summaries.
 * 6. Confirm pagination metadata reflects correct record counts.
 */
export async function test_api_community_subscription_search_with_active_filter(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate a new member
  const memberConnection: api.IConnection = { host: connection.host };
  const memberResponse = await authorize_member_join(memberConnection, {
    body: {},
  });
  typia.assert(memberResponse);
  // 2. Create a community subscription for the authenticated member
  const subscription =
    await generate_random_reddit_like_community_member_community_subscriptions_create(
      memberConnection,
      { body: {} },
    );
  typia.assert(subscription);
  // 3. Search for active community subscriptions
  const request = {
    isActive: true,
  } satisfies IRedditLikeCommunityCommunitySubscription.IRequest;
  const results =
    await api.functional.redditLikeCommunity.member.community_subscriptions.index(
      memberConnection,
      { body: request },
    );
  typia.assert(results);
  // 4. Validate at least one subscription is returned
  TestValidator.predicate(
    "active subscriptions returned",
    results.data.length >= 1,
  );
  // 5. Find our created subscription in the results
  const found = results.data.find((s) => s.id === subscription.id)! satisfies IRedditLikeCommunityCommunitySubscription.ISummary;
  typia.assert(found);
  TestValidator.equals(
    "subscription found in search results",
    found.id,
    subscription.id,
  );
  // 6. Verify is_active is true
  TestValidator.equals("subscription is active", found.is_active, true);
  // 7. Verify member summary data
  TestValidator.equals("member id matches", found.member.id, memberResponse.id);
  TestValidator.predicate(
    "member username exists",
    found.member.username.length > 0,
  );
  TestValidator.predicate("member email exists", found.member.email.length > 0);
  TestValidator.predicate(
    "member created_at exists",
    found.member.created_at.length > 0,
  );
  // 8. Verify community summary data
  TestValidator.equals(
    "community id matches",
    found.community.id,
    subscription.community.id,
  );
  TestValidator.predicate(
    "community name exists",
    found.community.name.length > 0,
  );
  TestValidator.predicate(
    "community description exists",
    found.community.description.length > 0,
  );
  TestValidator.predicate(
    "community subscriber count is valid",
    found.community.subscriber_count >= 0,
  );
  // 9. Verify pagination metadata
  TestValidator.predicate(
    "pagination records count is valid",
    results.pagination.records >= results.data.length,
  );
  TestValidator.predicate(
    "pagination current page is valid",
    results.pagination.current >= 1,
  );
}