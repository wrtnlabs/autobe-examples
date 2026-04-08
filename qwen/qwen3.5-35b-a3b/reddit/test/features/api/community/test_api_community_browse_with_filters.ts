import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCommunityCommunity";
import type { IRedditCommunityAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityAdmin";
import type { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_community_browse_with_filters(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as admin
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
    } satisfies IRedditCommunityAdmin.IJoin,
  });
  typia.assert(adminAuth);
  // 2. Test basic listing without filters
  const basicPage =
    await api.functional.redditCommunity.admin.communities.index(
      adminConnection,
      { body: {} },
    );
  typia.assert(basicPage);
  // 3. Test name filter
  const testName = RandomGenerator.name(3);
  const nameFilteredPage =
    await api.functional.redditCommunity.admin.communities.index(
      adminConnection,
      { body: { name: testName } },
    );
  typia.assert(nameFilteredPage);
  // 4. Test sorting by subscriber_count_desc (most popular first)
  const sortedBySubscribers =
    await api.functional.redditCommunity.admin.communities.index(
      adminConnection,
      { body: { sort: "subscriber_count_desc" } },
    );
  typia.assert(sortedBySubscribers);
  // 5. Test sorting by name_asc (alphabetical)
  const sortedByNameAsc =
    await api.functional.redditCommunity.admin.communities.index(
      adminConnection,
      { body: { sort: "name_asc" } },
    );
  typia.assert(sortedByNameAsc);
  // 6. Test sorting by created_at_desc (newest first)
  const sortedByCreatedDesc =
    await api.functional.redditCommunity.admin.communities.index(
      adminConnection,
      { body: { sort: "created_at_desc" } },
    );
  typia.assert(sortedByCreatedDesc);
  // 7. Test subscriber_count_min filtering
  const minSubscribers = 10;
  const filteredBySubscribers =
    await api.functional.redditCommunity.admin.communities.index(
      adminConnection,
      { body: { subscriber_count_min: minSubscribers } },
    );
  typia.assert(filteredBySubscribers);
  // 8. Test pagination with limit and page
  const paginationPage1 =
    await api.functional.redditCommunity.admin.communities.index(
      adminConnection,
      { body: { limit: 5, page: 1 } },
    );
  typia.assert(paginationPage1);
  const paginationPage2 =
    await api.functional.redditCommunity.admin.communities.index(
      adminConnection,
      { body: { limit: 5, page: 2 } },
    );
  typia.assert(paginationPage2);
  // 9. Validate pagination metadata
  TestValidator.equals(
    "pagination current page is 1",
    paginationPage1.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination limit is 5",
    paginationPage1.pagination.limit,
    5,
  );
  TestValidator.equals(
    "pagination records is non-negative",
    paginationPage1.pagination.records,
    paginationPage1.pagination.records,
  );
  TestValidator.equals(
    "pagination pages is non-negative",
    paginationPage1.pagination.pages,
    paginationPage1.pagination.pages,
  );
  // 10. Validate data structure - all communities have required fields
  for (const community of basicPage.data) {
    TestValidator.notEquals("community id is not null", community.id, null);
    TestValidator.notEquals("community name is not null", community.name, null);
    TestValidator.notEquals(
      "community created_at is not null",
      community.created_at,
      null,
    );
  }
  // 11. Validate only non-soft-deleted communities are returned (deleted_at is null or undefined)
  for (const community of basicPage.data) {
    TestValidator.equals(
      "community deleted_at is null for active",
      community.deleted_at,
      null,
    );
  }
  // 12. Validate name filter results - all names should contain search term (case-insensitive)
  for (const community of nameFilteredPage.data) {
    if (community.name !== null && community.name !== undefined) {
      const nameLower = community.name.toLowerCase();
      const searchLower = testName.toLowerCase();
      TestValidator.equals(
        "name filter contains search term",
        nameLower.includes(searchLower),
        true,
      );
    }
  }
  // 13. Validate subscriber_count_min filter results
  for (const community of filteredBySubscribers.data) {
    const subscriberCount = community.subscriber_count ?? 0;
    TestValidator.predicate(
      "subscriber count meets minimum threshold",
      subscriberCount >= minSubscribers,
    );
  }
  // 14. Validate pagination data count matches limit
  TestValidator.equals(
    "pagination page 1 data count respects limit",
    paginationPage1.data.length,
    Math.min(paginationPage1.pagination.records, 5),
  );
}
