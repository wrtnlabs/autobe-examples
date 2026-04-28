import api from "@ORGANIZATION/PROJECT-api";
import type { IEcommercePlatformSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformSeller";
import type { IEcommercePlatformSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformSellerProfile";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommercePlatformSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommercePlatformSeller";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

/**
 * Tests filtering of ecommerce platform seller accounts by their ban status.
 *
 * Validates that the isBanned boolean filter correctly separates banned sellers from active ones. Verifies that all returned seller summaries carry the expected isBanned flag matching the filter value. Confirms pagination metadata values such as current page, limit, and records are properly populated.
 *
 * 1. Request sellers filtered by isBanned true and assert response structure.
 * 2. Iterate through returned seller summaries and validate each has isBanned set to true.
 * 3. Request sellers filtered by isBanned false and assert response structure.
 * 4. Iterate through returned seller summaries and validate each has isBanned set to false.
 * 5. Confirm pagination metadata fields are non-negative integers.
 */
export async function test_api_seller_filter_by_ban_status(
  connection: api.IConnection,
) {
  const sellerConnection: api.IConnection = { host: connection.host };
  // 1. Filter banned sellers (isBanned: true)
  const bodyBanned = {
    isBanned: true,
  } satisfies IEcommercePlatformSeller.IRequest;
  const bannedResponse = await api.functional.ecommercePlatform.sellers.index(
    sellerConnection,
    { body: bodyBanned },
  );
  typia.assert(bannedResponse);
  // 2. Validate all returned sellers have isBanned = true
  TestValidator.predicate(
    "banned filter pagination current positive",
    bannedResponse.pagination.current > 0,
  );
  TestValidator.predicate(
    "banned filter pagination limit non-negative",
    bannedResponse.pagination.limit >= 0,
  );
  TestValidator.predicate(
    "banned filter pagination records non-negative",
    bannedResponse.pagination.records >= 0,
  );
  for (const seller of bannedResponse.data) {
    TestValidator.equals("seller is banned", seller.isBanned, true);
  }
  // 3. Filter active sellers (isBanned: false)
  const bodyActive = {
    isBanned: false,
  } satisfies IEcommercePlatformSeller.IRequest;
  const activeResponse = await api.functional.ecommercePlatform.sellers.index(
    sellerConnection,
    { body: bodyActive },
  );
  typia.assert(activeResponse);
  // 4. Validate all returned sellers have isBanned = false
  TestValidator.predicate(
    "active filter pagination current positive",
    activeResponse.pagination.current > 0,
  );
  TestValidator.predicate(
    "active filter pagination limit non-negative",
    activeResponse.pagination.limit >= 0,
  );
  TestValidator.predicate(
    "active filter pagination records non-negative",
    activeResponse.pagination.records >= 0,
  );
  for (const seller of activeResponse.data) {
    TestValidator.equals("seller is not banned", seller.isBanned, false);
  }
}
