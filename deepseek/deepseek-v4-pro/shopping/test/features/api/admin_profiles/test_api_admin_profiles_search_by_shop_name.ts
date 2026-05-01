import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallSellerProfile";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerProfile";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

/**
 * Test administrator search of seller profiles by shop name with partial text matching.
 *
 * Verifies that the administrator profiles search endpoint correctly filters seller profiles by shop name using ILIKE-based substring matching. The test authenticates an administrator via join, retrieves the full profile dataset as a baseline, extracts a partial substring from a random seller's shop name, and validates that search results properly include only matching profiles.
 *
 * Special attention is given to confirming that the GIN trigram index-backed ILIKE matching correctly includes profiles whose shop names contain the search term while excluding non-matching profiles and null shop names. Sort order validation ensures results are returned in shop_name ascending order with null values at the end.
 *
 * 1. Administrator authenticates via authorize_admin_join.
 * 2. Full profile list is retrieved as baseline for comparison.
 * 3. A seller with a non-null shop name is randomly selected.
 * 4. A substring is extracted from the selected shop name as the search term.
 * 5. Profiles are searched with the partial shop name substring.
 * 6. The source seller is verified to be included in results.
 * 7. Every result is verified to contain the search term in its shop name.
 * 8. Non-matching and null-shop-name profiles are verified to be excluded.
 * 9. Results are validated to be sorted by shop_name ascending.
 */
export async function test_api_admin_profiles_search_by_shop_name(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as administrator
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {});
  // 2. Fetch all seller profiles without search filter for baseline
  const allProfiles = await api.functional.shoppingMall.admin.profiles.index(
    adminConnection,
    {
      body: {
        limit: 100,
      } satisfies IShoppingMallSellerProfile.IRequest,
    },
  );
  typia.assert(allProfiles);
  // Identify sellers with non-null shop names
  const sellersWithShopName = allProfiles.data.filter(
    (profile) => profile.shop_name !== null,
  );
  // 3. Edge case: no sellers with shop names
  if (sellersWithShopName.length === 0) {
    const emptySearch = await api.functional.shoppingMall.admin.profiles.index(
      adminConnection,
      {
        body: {
          search: RandomGenerator.name(),
          limit: 100,
        } satisfies IShoppingMallSellerProfile.IRequest,
      },
    );
    typia.assert(emptySearch);
    TestValidator.equals(
      "empty results when no shop names exist",
      emptySearch.data.length,
      0,
    );
    return;
  }
  // 4. Pick a random seller and extract partial shop name substring
  const targetSeller = RandomGenerator.pick(sellersWithShopName);
  const searchTerm = RandomGenerator.substring(targetSeller.shop_name!);
  // If substring is empty, use the full shop name
  const effectiveSearchTerm =
    searchTerm.length > 0 ? searchTerm : targetSeller.shop_name!;
  // 5. Search with the partial shop name
  const searchResults = await api.functional.shoppingMall.admin.profiles.index(
    adminConnection,
    {
      body: {
        search: effectiveSearchTerm,
        limit: 100,
      } satisfies IShoppingMallSellerProfile.IRequest,
    },
  );
  typia.assert(searchResults);
  // 6. Verify the source seller is included in results
  TestValidator.predicate(
    "source seller found in search results",
    searchResults.data.some((p) => p.id === targetSeller.id),
  );
  // 7. Verify all results contain the search term (ILIKE substring matching)
  const lowerSearchTerm = effectiveSearchTerm.toLowerCase();
  for (const profile of searchResults.data) {
    TestValidator.predicate(
      `profile "${profile.shop_name}" contains search term`,
      profile.shop_name !== null &&
        profile.shop_name.toLowerCase().includes(lowerSearchTerm),
    );
  }
  // 8. Verify non-matching profiles are excluded from results
  const nonMatchingProfiles = allProfiles.data.filter(
    (p) =>
      p.shop_name === null ||
      !p.shop_name.toLowerCase().includes(lowerSearchTerm),
  );
  for (const nonMatch of nonMatchingProfiles) {
    TestValidator.predicate(
      `non-matching profile "${nonMatch.shop_name}" excluded from results`,
      !searchResults.data.some((p) => p.id === nonMatch.id),
    );
  }
  // 9. Validate sort order: shop_name ascending, nulls last
  const resultShopNames = searchResults.data
    .filter((p) => p.shop_name !== null)
    .map((p) => p.shop_name!);
  for (let i = 1; i < resultShopNames.length; i++) {
    TestValidator.predicate(
      `sorted by shop_name ascending at position ${i}`,
      resultShopNames[i - 1]!.localeCompare(resultShopNames[i]!) <= 0,
    );
  }
  // 10. Verify null shop names appear at the end
  const nullCount = searchResults.data.filter(
    (p) => p.shop_name === null,
  ).length;
  if (nullCount > 0) {
    const lastIndices = searchResults.data.slice(-nullCount);
    TestValidator.predicate(
      "null shop names sorted last",
      lastIndices.every((p) => p.shop_name === null),
    );
  }
  // 11. Validate pagination metadata
  TestValidator.equals(
    "pagination current page is 1",
    searchResults.pagination.current,
    1,
  );
  TestValidator.predicate(
    "search results count does not exceed total",
    searchResults.data.length <= allProfiles.data.length,
  );
}
