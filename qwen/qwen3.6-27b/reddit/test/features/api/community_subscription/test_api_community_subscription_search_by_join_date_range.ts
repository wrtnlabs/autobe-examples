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
 * Test searching community subscriptions within a specific join date range.
 *
 * Authenticates a member and creates a subscription, then searches using the
 * joinedAtStart and joinedAtEnd date range filters to verify that only
 * subscriptions matching the join time window are returned. Confirms that
 * matched results include full member and community JOIN summaries. Also
 * validates that searching with a date range outside the subscription period
 * returns an empty result set with zero records in pagination metadata.
 *
 * 1. Authenticate a new member via join endpoint.
 * 2. Create a community subscription for the member.
 * 3. Search with a date range that includes the subscription's joined_at.
 * 4. Verify the returned subscription contains member and community summaries.
 * 5. Search with a date range before the subscription's joined_at.
 * 6. Verify empty results with 0 pagination records.
 */
export async function test_api_community_subscription_search_by_join_date_range(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate member
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {},
  });
  typia.assert(member);
  // 2. Create a community subscription
  const subscription =
    await generate_random_reddit_like_community_member_community_subscriptions_create(
      memberConnection,
      { body: {} },
    );
  typia.assert(subscription);
  // 3. Search with date range that includes the subscription
  const joinedAt = subscription.joined_at;
  const searchWithinRange =
    await api.functional.redditLikeCommunity.member.community_subscriptions.index(
      memberConnection,
      {
        body: {
          memberId: member.id,
          joinedAtStart: new Date(
            new Date(joinedAt).getTime() - 60000,
          ).toISOString(),
          joinedAtEnd: new Date(
            new Date(joinedAt).getTime() + 60000,
          ).toISOString(),
        } satisfies IRedditLikeCommunityCommunitySubscription.IRequest,
      },
    );
  typia.assert(searchWithinRange);
  // 4. Verify subscription found and has JOIN summaries
  TestValidator.predicate(
    "subscription found within date range",
    searchWithinRange.data.length > 0,
  );
  TestValidator.equals(
    "pagination records matches data length",
    searchWithinRange.pagination.records,
    searchWithinRange.data.length,
  );
  if (searchWithinRange.data.length > 0) {
    const found = searchWithinRange.data[0];
    typia.assert(found);
    TestValidator.equals("member id matches", found.member.id, member.id);
    TestValidator.equals(
      "community id matches",
      found.community.id,
      subscription.community.id,
    );
  }
  // 5. Search with date range before subscription joined_at (1 year ago to 1 minute before)
  const oneYearAgo = new Date(
    new Date(joinedAt).getTime() - 365 * 24 * 60 * 60 * 1000,
  ).toISOString();
  const oneMilliBefore = new Date(
    new Date(joinedAt).getTime() - 1000,
  ).toISOString();
  const searchBeforeRange =
    await api.functional.redditLikeCommunity.member.community_subscriptions.index(
      memberConnection,
      {
        body: {
          memberId: member.id,
          joinedAtStart: oneYearAgo,
          joinedAtEnd: oneMilliBefore,
        } satisfies IRedditLikeCommunityCommunitySubscription.IRequest,
      },
    );
  typia.assert(searchBeforeRange);
  // 6. Verify empty results
  TestValidator.equals(
    "no subscription found before join date",
    searchBeforeRange.data.length,
    0,
  );
  TestValidator.equals(
    "pagination records is zero for empty range",
    searchBeforeRange.pagination.records,
    0,
  );
}
