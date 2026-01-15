import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformInventoryAdjustments } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformInventoryAdjustments";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformInventoryAdjustments } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformInventoryAdjustments";
import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
export async function test_api_inventory_adjustments_search_by_date_range(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create member connection and authenticate
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies ICommunityPlatformMember.IJoin,
  });
  typia.assert(member);
  // Step 2: Prepare date range for search - last 3 days
  const today = new Date();
  const threeDaysAgo = new Date(today.getTime() - 3 * 24 * 60 * 60 * 1000);
  // Step 3: Execute inventory adjustment search with date range filter
  const searchResult =
    await api.functional.communityPlatform.inventory_adjustments.index(
      memberConnection,
      {
        body: {
          adjusted_at_from: threeDaysAgo.toISOString(),
          adjusted_at_to: today.toISOString(),
          page: 1,
          limit: 10,
          sort_by: "adjusted_at",
          order: "desc",
        } satisfies ICommunityPlatformInventoryAdjustments.IRequest,
      },
    );
  typia.assert(searchResult);
  // Step 4: Validate response structure
  TestValidator.equals(
    "pagination current page is 1",
    searchResult.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination limit is 10",
    searchResult.pagination.limit,
    10,
  );
  TestValidator.predicate(
    "pagination records is non-negative",
    () => searchResult.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages is non-negative",
    () => searchResult.pagination.pages >= 0,
  );
  // Step 5: Validate sorting by adjusted_at in descending order
  if (searchResult.data.length > 1) {
    for (let i = 0; i < searchResult.data.length - 1; i++) {
      const current = new Date(searchResult.data[i].adjusted_at);
      const next = new Date(searchResult.data[i + 1].adjusted_at);
      TestValidator.predicate(
        `adjustment at position ${i} should be later than position ${i + 1}`,
        () => current >= next,
      );
    }
  }
  // Step 6: Validate data structure of each adjustment using typia.assert()
  // typia.assert() in step 3 already validates the complete structure
  // No additional validation needed for fields
  // The review step has determined that any additional type validation is redundant
}
