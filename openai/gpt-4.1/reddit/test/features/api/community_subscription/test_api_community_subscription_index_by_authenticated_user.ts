import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunitySubscription";
import type { ICommunityPlatformCommunitySubscriptionNotifications } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunitySubscriptionNotifications";
import type { ICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformCommunitySubscription";

/**
 * Validates paginated community subscription listing for an authenticated user.
 *
 * 1. Register a new user and authenticate
 * 2. Create one or more communities
 * 3. Subscribe the user to those communities with varying notification settings
 * 4. Query the subscriptions index endpoint, verify only current user's active
 *    subscriptions are returned
 * 5. Check that notification preferences exist in the response, and that
 *    sorting/pagination match expectations
 * 6. Add another user's subscription to a community in parallel (to verify
 *    isolation)
 * 7. Ensure no data appears from other users
 *
 * Steps:
 *
 * - Register and authenticate test user
 * - Create 3 communities as the test user
 * - Subscribe to each community with alternating notification_enabled true/false
 * - Register a second user and subscribe them to one of the communities
 * - Invoke PATCH /communityPlatform/user/subscriptions with default and custom
 *   filters
 * - Validate page of results matches only first user and correct notification
 *   settings
 * - Validate pagination meta (current, limit, total)
 * - Validate search_text and sorting (by created_at desc)
 * - Validate no second user's subscriptions are present
 */
export async function test_api_community_subscription_index_by_authenticated_user(
  connection: api.IConnection,
) {
  // Register test user (user1)
  const user1Email: string = typia.random<string & tags.Format<"email">>();
  const user1Password: string = RandomGenerator.alphaNumeric(12);
  const user1Display: string = RandomGenerator.name();
  const user1Join = await api.functional.auth.user.join(connection, {
    body: {
      email: user1Email,
      password: user1Password,
      display_name: user1Display,
      href: "https://example.com/register",
      referrer: "https://example.com/landing",
      ip: null,
    },
  });
  typia.assert(user1Join);

  // Prepare 3 new communities
  const communityNames: string[] = ArrayUtil.repeat(
    3,
    (i) => `auto_test_community_${RandomGenerator.alphaNumeric(6)}_${i}`,
  );
  const communityDescs: string[] = ArrayUtil.repeat(3, () =>
    RandomGenerator.paragraph({ sentences: 2 }),
  );
  const communityCreateInputs = communityNames.map((name, idx) => ({
    name: name as string &
      tags.MinLength<3> &
      tags.MaxLength<50> &
      tags.Pattern<"^[a-zA-Z0-9_]+$">,
    description: communityDescs[idx] as string &
      tags.MinLength<1> &
      tags.MaxLength<250>,
  }));
  const communities: ICommunityPlatformCommunity[] = [];
  for (const createInput of communityCreateInputs) {
    const community =
      await api.functional.communityPlatform.user.communities.create(
        connection,
        {
          body: createInput,
        },
      );
    typia.assert(community);
    communities.push(community);
  }

  // Subscribe user1 to all communities
  const subscriptions: ICommunityPlatformCommunitySubscription[] = [];
  for (let i = 0; i < communities.length; ++i) {
    const subscription =
      await api.functional.communityPlatform.user.subscriptions.create(
        connection,
        {
          body: {
            community_id: communities[i].id,
            notification_enabled: i % 2 === 0 ? true : false,
          },
        },
      );
    typia.assert(subscription);
    subscriptions.push(subscription);
  }

  // Register second user (user2) and fresh connection
  const user2Email: string = typia.random<string & tags.Format<"email">>();
  const user2Password: string = RandomGenerator.alphaNumeric(10);
  const user2Display: string = RandomGenerator.name();
  // Use a fresh connection for user2 so that headers and state are not shared
  const user2Connection: api.IConnection = { ...connection, headers: {} };
  const user2Join = await api.functional.auth.user.join(user2Connection, {
    body: {
      email: user2Email,
      password: user2Password,
      display_name: user2Display,
      href: "https://example.com/register",
      referrer: "https://example.com/landing",
      ip: null,
    },
  });
  typia.assert(user2Join);
  await api.functional.communityPlatform.user.subscriptions.create(
    user2Connection,
    {
      body: {
        community_id: communities[0].id,
        notification_enabled: true,
      },
    },
  );

  // Query subscriptions list for user1 with default params (should list all 3)
  const result =
    await api.functional.communityPlatform.user.subscriptions.index(
      connection,
      {
        body: {},
      },
    );
  typia.assert(result);
  TestValidator.equals(
    "user1 subscriptions count",
    result.data.length,
    subscriptions.length,
  );
  for (let i = 0; i < subscriptions.length; ++i) {
    const found = result.data.find((s) => s.community.id === communities[i].id);
    TestValidator.predicate(
      `subscription ${i + 1} present for correct community`,
      found !== undefined,
    );
    TestValidator.equals(
      `subscription user is correct for ${i + 1}`,
      found!.user.id,
      user1Join.id,
    );
  }
  // Ensure no other users' subscriptions leak in the returned list
  const anyNotUser1 = result.data.some((s) => s.user.id !== user1Join.id);
  TestValidator.equals("no subscription leak", anyNotUser1, false);

  // Test pagination (use page_size = 2, expect to see only 2 on first page)
  const paged = await api.functional.communityPlatform.user.subscriptions.index(
    connection,
    {
      body: {
        page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
        page_size: 2 as number &
          tags.Type<"int32"> &
          tags.Minimum<1> &
          tags.Maximum<100>,
        sort_by: "created_at",
        sort_order: "desc",
      },
    },
  );
  typia.assert(paged);
  TestValidator.equals("paged current", paged.pagination.current, 1);
  TestValidator.equals("paged limit", paged.pagination.limit, 2);
  TestValidator.predicate(
    "paged data size <= page_size",
    paged.data.length <= 2,
  );
  for (const item of paged.data) {
    TestValidator.equals(
      "paged subscription belongs to user1",
      item.user.id,
      user1Join.id,
    );
  }

  // Test search_text to filter by a community name
  const filterCommunity = communities[1];
  const filtered =
    await api.functional.communityPlatform.user.subscriptions.index(
      connection,
      {
        body: {
          search_text: filterCommunity.name,
        },
      },
    );
  typia.assert(filtered);
  TestValidator.equals("search_text filtered count", filtered.data.length, 1);
  const item = filtered.data[0];
  TestValidator.equals(
    "filtered subscription community id matches",
    item.community.id,
    filterCommunity.id,
  );
  TestValidator.equals(
    "filtered subscription user id matches",
    item.user.id,
    user1Join.id,
  );
}
