import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditCloneCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCloneCommunity";
import type { IPageIRedditCloneCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCloneCommunitySubscription";
import type { IRedditCloneCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunity";
import type { IRedditCloneCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunitySubscription";
import type { IRedditCloneMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMember";
import type { IRedditCloneUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneUserProfile";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

/**
 * Test the empty state handling of community subscription listing endpoint.
 *
 * Validates that the subscriptions endpoint correctly handles communities with zero or few subscribers by returning a properly structured paginated response without errors. This edge case test ensures the API gracefully manages result sets and provides accurate pagination metadata.
 *
 * The test queries the subscription list for a community and verifies the response structure contains the expected data array and pagination metadata with proper field types and values. This confirms the endpoint properly handles the subscription listing operation regardless of subscriber count.
 *
 * 1. Retrieve an existing community from the communities list
 * 2. Query the subscriptions endpoint for this community
 * 3. Validate the response structure contains:
 *    - Data array (may be empty or contain subscriptions)
 *    - Pagination metadata with current, limit, records, and pages fields
 * 4. Verify no errors are thrown during the query
 * 5. Validate pagination metadata consistency (pages = ceil(records / limit))
 */
export async function test_api_community_subscription_list_empty_state(
  connection: api.IConnection,
): Promise<void> {
  // 1. Retrieve an existing community from the communities list
  const communitiesList = await api.functional.redditClone.communities.index(
    connection,
    {
      body: {
        page: 1,
        limit: 1,
        sort: "created_at",
        direction: "DESC",
      } satisfies IRedditCloneCommunity.IRequest,
    },
  );
  typia.assert(communitiesList);
  TestValidator.predicate(
    "communities list has data",
    communitiesList.data.length > 0,
  );
  const testCommunity = communitiesList.data[0];
  typia.assert(testCommunity);
  // 2. Query the subscriptions endpoint for this community
  const subscriptions =
    await api.functional.redditClone.communities.subscriptions.index(
      connection,
      {
        communityId: testCommunity.id,
        body: {
          page: 1,
          limit: 20,
        } satisfies IRedditCloneCommunitySubscription.IRequest,
      },
    );
  typia.assert(subscriptions);
  // 3. Validate the response structure - data array exists
  TestValidator.predicate(
    "data array exists",
    Array.isArray(subscriptions.data),
  );
  // 4. Verify pagination metadata fields exist and have correct types
  TestValidator.predicate(
    "current page is positive",
    subscriptions.pagination.current >= 1,
  );
  TestValidator.predicate(
    "limit is positive",
    subscriptions.pagination.limit > 0,
  );
  TestValidator.predicate(
    "records count is non-negative",
    subscriptions.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pages count is non-negative",
    subscriptions.pagination.pages >= 0,
  );
  // 5. Validate pagination consistency
  const expectedPages =
    subscriptions.pagination.records === 0
      ? 0
      : Math.ceil(
          subscriptions.pagination.records / subscriptions.pagination.limit,
        );
  TestValidator.equals(
    "pages calculation is correct",
    subscriptions.pagination.pages,
    expectedPages,
  );
  // 6. Validate data array length matches records on first page
  const expectedDataLength = Math.min(
    subscriptions.pagination.records,
    subscriptions.pagination.limit,
  );
  TestValidator.equals(
    "data length matches expected",
    subscriptions.data.length,
    expectedDataLength,
  );
  // 7. If records is 0, verify data array is empty (empty state test)
  if (subscriptions.pagination.records === 0) {
    TestValidator.equals(
      "empty state: data array is empty",
      subscriptions.data.length,
      0,
    );
    TestValidator.equals(
      "empty state: pages is 0",
      subscriptions.pagination.pages,
      0,
    );
  }
  // 8. If data is not empty, validate each subscription has required fields
  if (subscriptions.data.length > 0) {
    const firstSubscription = subscriptions.data[0];
    typia.assert(firstSubscription);
    TestValidator.predicate(
      "subscription has id",
      firstSubscription.id !== undefined,
    );
    TestValidator.predicate(
      "subscription has created_at",
      firstSubscription.created_at !== undefined,
    );
    TestValidator.predicate(
      "subscription has updated_at",
      firstSubscription.updated_at !== undefined,
    );
    TestValidator.predicate(
      "subscription has member",
      firstSubscription.member !== undefined,
    );
    TestValidator.predicate(
      "subscription has community",
      firstSubscription.community !== undefined,
    );
  }
}
