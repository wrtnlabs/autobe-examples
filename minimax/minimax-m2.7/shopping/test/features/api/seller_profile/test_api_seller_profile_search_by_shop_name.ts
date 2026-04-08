import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfile";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallSellerProfile";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

/**
 * Test admin searching seller profiles by shop name.
 *
 * Validates the admin seller profile search functionality through the PATCH
 * /ecommerceMall/admin/admin/seller-profiles endpoint. Tests case-insensitive
 * partial matching on shop names, verifies correct pagination metadata reflects
 * filtered results, and confirms empty results are returned when no profiles
 * match the search criteria.
 *
 * 1. Authenticate as admin via admin join endpoint.
 * 2. Retrieve baseline seller profiles without search to establish expected data.
 * 3. Search with a partial shop name string and verify matching profiles.
 * 4. Search with uppercase variant to verify case-insensitive matching.
 * 5. Search with non-matching string and verify empty data array.
 * 6. Validate pagination metadata matches actual filtered data count.
 */
export async function test_api_seller_profile_search_by_shop_name(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as admin
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {});
  // 2. Get baseline - all seller profiles without search filter
  const allProfiles =
    await api.functional.ecommerceMall.admin.admin.seller_profiles.index(
      adminConnection,
      {
        body: {} satisfies IEcommerceMallSellerProfile.IRequest,
      },
    );
  typia.assert(allProfiles);
  // Extract existing shop names for testing
  const existingShopNames = allProfiles.data
    .map((profile) => profile.name)
    .filter((name) => name.length > 0);
  // 3. Test partial search matching - find profiles containing a common substring
  const searchTerm = "shop";
  const searchResult =
    await api.functional.ecommerceMall.admin.admin.seller_profiles.index(
      adminConnection,
      {
        body: {
          search: searchTerm,
          limit: 100,
        } satisfies IEcommerceMallSellerProfile.IRequest,
      },
    );
  typia.assert(searchResult);
  // Verify all returned profiles contain the search term (case-insensitive)
  for (const profile of searchResult.data) {
    TestValidator.predicate(
      `profile "${profile.name}" contains search term "${searchTerm}"`,
      profile.name.toLowerCase().includes(searchTerm.toLowerCase()),
    );
  }
  // 4. Test case-insensitive search with uppercase
  const uppercaseSearchTerm = "SHOP";
  const uppercaseSearchResult =
    await api.functional.ecommerceMall.admin.admin.seller_profiles.index(
      adminConnection,
      {
        body: {
          search: uppercaseSearchTerm,
          limit: 100,
        } satisfies IEcommerceMallSellerProfile.IRequest,
      },
    );
  typia.assert(uppercaseSearchResult);
  // Verify case-insensitive matching
  for (const profile of uppercaseSearchResult.data) {
    TestValidator.predicate(
      `profile "${profile.name}" matches case-insensitive "${uppercaseSearchTerm}"`,
      profile.name.toLowerCase().includes(uppercaseSearchTerm.toLowerCase()),
    );
  }
  // 5. Test search with no matching results
  const nonMatchingSearchTerm = "zzznomatch999xyz";
  const nonMatchingResult =
    await api.functional.ecommerceMall.admin.admin.seller_profiles.index(
      adminConnection,
      {
        body: {
          search: nonMatchingSearchTerm,
          limit: 100,
        } satisfies IEcommerceMallSellerProfile.IRequest,
      },
    );
  typia.assert(nonMatchingResult);
  // Verify empty data array for non-matching search
  TestValidator.equals(
    "non-matching search returns empty data array",
    nonMatchingResult.data.length,
    0,
  );
  // 6. Verify pagination metadata reflects filtered count
  TestValidator.equals(
    "pagination records equals data array length",
    nonMatchingResult.pagination.records,
    nonMatchingResult.data.length,
  );
  // Test with existing shop name if available
  if (existingShopNames.length > 0) {
    const targetShopName = existingShopNames[0];
    // Test with substring of existing shop name
    const substring = targetShopName.substring(
      0,
      Math.min(3, targetShopName.length),
    );
    const substringSearch =
      await api.functional.ecommerceMall.admin.admin.seller_profiles.index(
        adminConnection,
        {
          body: {
            search: substring,
            limit: 100,
          } satisfies IEcommerceMallSellerProfile.IRequest,
        },
      );
    typia.assert(substringSearch);
    // Verify at least the target profile is in results
    const foundTarget = substringSearch.data.some(
      (profile) => profile.name === targetShopName,
    );
    TestValidator.predicate(
      `substring search "${substring}" includes target shop "${targetShopName}"`,
      foundTarget,
    );
  }
}
