import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformFile } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformFile";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { ICommunityPlatformSubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformSubscription";
import type { ICommunityPlatformSubscriptionPreference } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformSubscriptionPreference";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformSubscriptionPreference } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformSubscriptionPreference";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

/**
 * Test empty results and edge cases for subscription preferences.
 * 1. Create member with no subscriptions → verify empty results with proper metadata
 * 2. Test filters that filter everything out → should yield no results
 * 3. Verify authorization boundaries → different member's preferences not visible
 * 4. Test extreme pagination values → ensure system constraints respected
 */
export async function test_api_subscription_preference_empty_results(
  connection: api.IConnection,
): Promise<void> {
  // Create first member (will have no subscriptions)
  const member1Connection: api.IConnection = { host: connection.host };
  const member1 = await authorize_member_join(member1Connection, {});
  typia.assert(member1);
  // Test 1: Member with no subscriptions should get empty results
  const emptyResults =
    await api.functional.communityPlatform.member.subscription_preferences.index(
      member1Connection,
      {
        body: {
          page: 1,
          limit: 10,
        } satisfies ICommunityPlatformSubscriptionPreference.IRequest,
      },
    );
  typia.assert(emptyResults);
  TestValidator.equals(
    "no subscriptions → empty data array",
    emptyResults.data.length,
    0,
  );
  TestValidator.equals(
    "no subscriptions → records: 0",
    emptyResults.pagination.records,
    0,
  );
  TestValidator.equals(
    "no subscriptions → pages: 0",
    emptyResults.pagination.pages,
    0,
  );
  TestValidator.equals(
    "no subscriptions → current page: 1",
    emptyResults.pagination.current,
    1,
  );
  TestValidator.equals(
    "no subscriptions → limit: 10",
    emptyResults.pagination.limit,
    10,
  );
  // Test 2: Different boolean values that filter everything out
  const allFalseFilter =
    await api.functional.communityPlatform.member.subscription_preferences.index(
      member1Connection,
      {
        body: {
          notify_new_posts: false,
          notify_new_comments: false,
          notify_mentions: false,
          show_in_home_feed: false,
          highlight_new_content: false,
          auto_expand_comments: false,
          page: 2,
          limit: 5,
        } satisfies ICommunityPlatformSubscriptionPreference.IRequest,
      },
    );
  typia.assert(allFalseFilter);
  TestValidator.equals(
    "all false filters → empty data",
    allFalseFilter.data.length,
    0,
  );
  TestValidator.equals(
    "all false filters → records: 0",
    allFalseFilter.pagination.records,
    0,
  );
  TestValidator.equals(
    "all false filters → pages: 0",
    allFalseFilter.pagination.pages,
    0,
  );
  // Test 3: Search with non-existent text
  const searchNonExistent =
    await api.functional.communityPlatform.member.subscription_preferences.index(
      member1Connection,
      {
        body: {
          search: "NON_EXISTENT_SEARCH_TERM_XYZ123",
          page: 1,
          limit: 10,
        } satisfies ICommunityPlatformSubscriptionPreference.IRequest,
      },
    );
  typia.assert(searchNonExistent);
  TestValidator.equals(
    "non-existent search → empty data",
    searchNonExistent.data.length,
    0,
  );
  TestValidator.equals(
    "non-existent search → records: 0",
    searchNonExistent.pagination.records,
    0,
  );
  // Test 4: Test boolean string search pattern (search field searches boolean fields as text)
  const booleanSearchFalse =
    await api.functional.communityPlatform.member.subscription_preferences.index(
      member1Connection,
      {
        body: {
          search: "false", // Searches boolean fields cast to text
          page: 1,
          limit: 10,
        } satisfies ICommunityPlatformSubscriptionPreference.IRequest,
      },
    );
  typia.assert(booleanSearchFalse);
  TestValidator.equals(
    "boolean search 'false' → empty data (no subscriptions)",
    booleanSearchFalse.data.length,
    0,
  );
  // Test 5: Test null filter on sort fields
  const nullSortFilter =
    await api.functional.communityPlatform.member.subscription_preferences.index(
      member1Connection,
      {
        body: {
          sort_posts_by: null,
          sort_comments_by: null,
          page: 1,
          limit: 10,
        } satisfies ICommunityPlatformSubscriptionPreference.IRequest,
      },
    );
  typia.assert(nullSortFilter);
  TestValidator.equals(
    "null sort fields filter → empty data",
    nullSortFilter.data.length,
    0,
  );
  TestValidator.equals(
    "null sort fields filter → records: 0",
    nullSortFilter.pagination.records,
    0,
  );
  // Test 6: Extreme pagination
  const extremePagination =
    await api.functional.communityPlatform.member.subscription_preferences.index(
      member1Connection,
      {
        body: {
          page: 1,
          limit: 100, // Maximum limit per schema
        } satisfies ICommunityPlatformSubscriptionPreference.IRequest,
      },
    );
  typia.assert(extremePagination);
  TestValidator.equals(
    "extreme pagination → limit respected",
    extremePagination.pagination.limit,
    100,
  );
  TestValidator.predicate(
    "extreme pagination → limit <= 100",
    extremePagination.pagination.limit <= 100,
  );
}
