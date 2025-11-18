import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminJoin";
import type { IShoppingMallCountry } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCountry";
import type { IShoppingMallRegion } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRegion";

/**
 * Validate deletion behavior for a non-existent region-level shipping policy.
 *
 * Business purpose: Ensures that when an authenticated admin attempts to delete
 * a region-level shipping policy that does not exist, the platform responds
 * with an error and does not require any pre-existing policy records. The test
 * focuses on the negative-path behavior of the DELETE
 * /shoppingMall/admin/countries/{countryCode}/regions/{regionCode}/shippingPolicies/{policyId}
 * endpoint while ensuring that the country and region context is valid.
 *
 * Flow:
 *
 * 1. Admin registration and implicit authentication via POST /auth/admin/join.
 * 2. Country creation via POST /shoppingMall/admin/countries.
 * 3. Region creation under that country via POST
 *    /shoppingMall/admin/countries/{countryCode}/regions.
 * 4. Generate a random policyId that is guaranteed to be non-existent (no shipping
 *    policy creation occurs in this test).
 * 5. Call DELETE
 *    /shoppingMall/admin/countries/{countryCode}/regions/{regionCode}/shippingPolicies/{policyId}
 *    and assert that an error is thrown.
 */
export async function test_api_admin_region_shipping_policy_delete_nonexistent_policy(
  connection: api.IConnection,
) {
  // 1. Admin registration and authentication
  const joinBody = typia.random<IShoppingMallAdminJoin.ICreate>();
  const adminAuthorized: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: joinBody,
    });
  typia.assert(adminAuthorized);

  // 2. Create a country context for the region and shipping policies
  const countryBody = typia.random<IShoppingMallCountry.ICreate>();
  const country: IShoppingMallCountry =
    await api.functional.shoppingMall.admin.countries.create(connection, {
      body: countryBody,
    });
  typia.assert(country);

  // 3. Create a region under the created country
  const regionBody = typia.random<IShoppingMallRegion.ICreate>();
  const region: IShoppingMallRegion =
    await api.functional.shoppingMall.admin.countries.regions.create(
      connection,
      {
        countryCode: country.country_code,
        body: regionBody,
      },
    );
  typia.assert(region);

  // 4. Generate a non-existent policyId (no shipping policies are created)
  const nonExistentPolicyId = typia.random<string & tags.Format<"uuid">>();

  // 5. Attempt to delete the non-existent shipping policy and expect an error
  await TestValidator.error(
    "deleting a non-existent region shipping policy should fail",
    async () => {
      await api.functional.shoppingMall.admin.countries.regions.shippingPolicies.erase(
        connection,
        {
          countryCode: country.country_code,
          regionCode: region.code,
          policyId: nonExistentPolicyId,
        },
      );
    },
  );
}
