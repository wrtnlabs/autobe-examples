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
 * Test advanced filtering capabilities of subscription preferences.
 * 1. Create a member account and authenticate
 * 2. Test filtering by individual boolean flags
 * 3. Test combined boolean filters
 * 4. Test text search across preference fields
 * 5. Test pagination with different page sizes
 * 6. Test sorting options (created_at desc, updated_at asc)
 * 7. Verify filter intersections and edge cases
 */
export async function test_api_subscription_preference_advanced_filtering(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member account and authenticate
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {});
  // 2. Test filtering by notify_new_posts=true
  const notifyNewPostsTrue =
    await api.functional.communityPlatform.member.subscription_preferences.index(
      memberConnection,
      {
        body: {
          notify_new_posts: true,
        } satisfies ICommunityPlatformSubscriptionPreference.IRequest,
      },
    );
  typia.assert(notifyNewPostsTrue);
  TestValidator.equals(
    "notify_new_posts=true filter returns paginated response",
    notifyNewPostsTrue.data,
    [],
  );
  TestValidator.equals(
    "pagination metadata for empty results",
    notifyNewPostsTrue.pagination.records,
    0,
  );
  TestValidator.equals(
    "pagination pages for empty results",
    notifyNewPostsTrue.pagination.pages,
    0,
  );
  // 3. Test filtering by show_in_home_feed=false
  const showInHomeFeedFalse =
    await api.functional.communityPlatform.member.subscription_preferences.index(
      memberConnection,
      {
        body: {
          show_in_home_feed: false,
        } satisfies ICommunityPlatformSubscriptionPreference.IRequest,
      },
    );
  typia.assert(showInHomeFeedFalse);
  TestValidator.equals(
    "show_in_home_feed=false filter returns paginated response",
    showInHomeFeedFalse.data,
    [],
  );
  // 4. Test combined boolean filters
  const combinedFilters =
    await api.functional.communityPlatform.member.subscription_preferences.index(
      memberConnection,
      {
        body: {
          notify_new_posts: true,
          notify_new_comments: false,
          show_in_home_feed: true,
        } satisfies ICommunityPlatformSubscriptionPreference.IRequest,
      },
    );
  typia.assert(combinedFilters);
  TestValidator.equals(
    "combined filters return empty array when no matches",
    combinedFilters.data,
    [],
  );
  // 5. Test text search
  const textSearch =
    await api.functional.communityPlatform.member.subscription_preferences.index(
      memberConnection,
      {
        body: {
          search: "true",
        } satisfies ICommunityPlatformSubscriptionPreference.IRequest,
      },
    );
  typia.assert(textSearch);
  TestValidator.equals(
    "text search returns paginated response",
    textSearch.data,
    [],
  );
  // 6. Test pagination with page size 10
  const paginationTest =
    await api.functional.communityPlatform.member.subscription_preferences.index(
      memberConnection,
      {
        body: {
          page: 1,
          limit: 10,
        } satisfies ICommunityPlatformSubscriptionPreference.IRequest,
      },
    );
  typia.assert(paginationTest);
  TestValidator.equals(
    "pagination with limit 10 returns correct metadata",
    paginationTest.pagination.limit,
    10,
  );
  TestValidator.equals(
    "page 1 is current page",
    paginationTest.pagination.current,
    1,
  );
  // 7. Test sorting by created_at desc (default)
  const sortCreatedDesc =
    await api.functional.communityPlatform.member.subscription_preferences.index(
      memberConnection,
      {
        body: {
          sort: "created_at,desc",
        } satisfies ICommunityPlatformSubscriptionPreference.IRequest,
      },
    );
  typia.assert(sortCreatedDesc);
  TestValidator.equals(
    "sort by created_at desc returns paginated response",
    sortCreatedDesc.data,
    [],
  );
  // 8. Test sorting by updated_at asc
  const sortUpdatedAsc =
    await api.functional.communityPlatform.member.subscription_preferences.index(
      memberConnection,
      {
        body: {
          sort: "updated_at,asc",
        },
      },
    );
}
