import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditCommunityCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCommunityCommunitySubscription";
import type { IRedditCommunityCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunitySubscription";
import type { IRedditCommunityGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityGuest";

/**
 * Test retrieving subscriptions for a member with no subscriptions.
 *
 * This test validates the edge case where a newly created member account has
 * not subscribed to any communities. The API should return an empty result set
 * with proper pagination metadata without throwing any errors.
 *
 * Test Flow:
 *
 * 1. Create a new member account via join endpoint
 * 2. Immediately retrieve the member's subscriptions (should be empty)
 * 3. Validate that data array is empty and pagination metadata is correct
 *
 * This ensures the subscription retrieval endpoint handles empty states
 * gracefully, which is the common initial state for new users.
 */
export async function test_api_member_subscriptions_empty_result_set(
  connection: api.IConnection,
) {
  // Step 1: Create a new member account
  const memberData = {
    username: RandomGenerator.alphaNumeric(12),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    display_name: RandomGenerator.name(2),
    bio: RandomGenerator.paragraph({ sentences: 3, wordMin: 4, wordMax: 8 }),
    avatar_url: typia.random<string & tags.Format<"uri">>(),
    show_online_status: false,
    show_subscribed_communities: true,
    show_activity_feed: true,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IRedditCommunityGuest.ICreate;

  const member: IRedditCommunityGuest.IAuthorized =
    await api.functional.auth.member.join(connection, { body: memberData });
  typia.assert(member);

  // Step 2: Retrieve subscriptions for the newly created member (should be empty)
  const requestBody = {
    page: 1,
    limit: 20,
  } satisfies IRedditCommunityCommunitySubscription.IRequest;

  const subscriptionsPage: IPageIRedditCommunityCommunitySubscription =
    await api.functional.redditCommunity.member.members.subscriptions.index(
      connection,
      {
        username: member.username,
        body: requestBody,
      },
    );
  typia.assert(subscriptionsPage);

  // Step 3: Validate empty result set with correct pagination metadata
  TestValidator.equals("data array is empty", subscriptionsPage.data, []);
  TestValidator.equals(
    "no subscription records exist",
    subscriptionsPage.pagination.records,
    0,
  );
  TestValidator.equals(
    "current page is zero",
    subscriptionsPage.pagination.current,
    0,
  );
  TestValidator.predicate(
    "pages is 0 or 1 for empty results",
    subscriptionsPage.pagination.pages === 0 ||
      subscriptionsPage.pagination.pages === 1,
  );
  TestValidator.predicate(
    "limit is positive",
    subscriptionsPage.pagination.limit > 0,
  );
}
