import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCommunityCommunity";
import type { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import type { IRedditCommunityGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityGuest";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_guest_join } from "../../../authorize/authorize_guest_join";
import { authorize_guest_refresh } from "../../../authorize/authorize_guest_refresh";

export async function test_api_guest_browse_communities_custom_pagination(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register guest account to establish session context
  const guestConnection: api.IConnection = { host: connection.host };
  await authorize_guest_join(guestConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.assert<string & tags.Format<"uri">>(typia.random<string>()),
    },
  });
  // 2. Test default pagination with page_size (default value from API)
  const page1 =
    await api.functional.redditCommunity.guest.browse_communities.browse(
      guestConnection,
    );
  typia.assert(page1);
  // 3. Validate pagination metadata structure
  TestValidator.predicate(
    "pagination metadata has limit",
    typeof page1.pagination.limit === "number",
  );
  TestValidator.predicate(
    "pagination metadata has current page",
    typeof page1.pagination.current === "number",
  );
  TestValidator.predicate(
    "pagination metadata has records count",
    typeof page1.pagination.records === "number",
  );
  TestValidator.predicate(
    "pagination metadata has pages count",
    typeof page1.pagination.pages === "number",
  );
  // 4. Verify data array contains communities with required fields
  TestValidator.predicate(
    "data array contains communities",
    page1.data.length > 0 || page1.pagination.records === 0,
  );
  for (const community of page1.data) {
    TestValidator.predicate(
      "community has valid UUID id",
      typeof community.id === "string",
    );
    TestValidator.equals(
      "community has name field",
      typeof community.name,
      "string",
    );
    TestValidator.equals(
      "community has created_at timestamp",
      typeof community.created_at,
      "string",
    );
  }
  // 5. Validate communities are sorted by subscriber_count desc, then id asc
  for (let i = 1; i < page1.data.length; i++) {
    const current = page1.data[i];
    const previous = page1.data[i - 1];
    if (current.subscriber_count === previous.subscriber_count) {
      TestValidator.predicate(
        "communities with same subscriber_count sorted by id asc",
        current.id > previous.id,
      );
    } else if (
      current.subscriber_count !== undefined &&
      previous.subscriber_count !== undefined
    ) {
      TestValidator.predicate(
        "communities sorted by subscriber_count desc",
        current.subscriber_count < previous.subscriber_count,
      );
    }
  }
  // 6. Test pagination consistency - verify pages calculation
  const expectedPages = Math.ceil(
    page1.pagination.records / page1.pagination.limit,
  );
  TestValidator.equals(
    "pages calculated correctly from records and limit",
    page1.pagination.pages,
    expectedPages,
  );
  // 7. Test with second request to verify pagination state
  const page2 =
    await api.functional.redditCommunity.guest.browse_communities.browse(
      guestConnection,
    );
  typia.assert(page2);
  // 8. Validate pagination metadata is consistent across requests
  TestValidator.equals(
    "pagination records count is consistent",
    page1.pagination.records,
    page2.pagination.records,
  );
  // 9. Verify pagination pages count is consistent
  TestValidator.equals(
    "pagination pages count is consistent",
    page1.pagination.pages,
    page2.pagination.pages,
  );
  // 10. Test boundary condition - if only one page, all records should be in data
  if (page1.pagination.pages === 1) {
    TestValidator.equals(
      "single page has all records",
      page1.pagination.records,
      page1.data.length,
    );
  }
  // 11. Validate no duplicate community IDs across pages
  const allIds = new Set<string>();
  for (const page of [page1, page2]) {
    for (const community of page.data) {
      if (allIds.has(community.id)) {
        throw new Error(`Duplicate community ID found: ${community.id}`);
      }
      allIds.add(community.id);
    }
  }
  TestValidator.predicate(
    "no duplicate community IDs across pages",
    allIds.size === page1.data.length + page2.data.length,
  );
  // 12. Test empty data case - when no communities exist
  if (page1.pagination.records === 0) {
    TestValidator.equals(
      "empty records has empty data array",
      page1.data.length,
      0,
    );
    TestValidator.equals(
      "empty records has zero pages",
      page1.pagination.pages,
      0,
    );
  }
  // 13. Validate all timestamps are ISO 8601 format
  for (const community of page1.data) {
    TestValidator.predicate(
      "created_at is valid ISO 8601 format",
      !isNaN(Date.parse(community.created_at)),
    );
  }
  // 14. Verify pagination metadata constraints
  TestValidator.predicate(
    "current page is at least 1",
    page1.pagination.current >= 1,
  );
  TestValidator.predicate("limit is positive", page1.pagination.limit > 0);
  TestValidator.predicate(
    "records is non-negative",
    page1.pagination.records >= 0,
  );
  TestValidator.predicate("pages is non-negative", page1.pagination.pages >= 0);
}