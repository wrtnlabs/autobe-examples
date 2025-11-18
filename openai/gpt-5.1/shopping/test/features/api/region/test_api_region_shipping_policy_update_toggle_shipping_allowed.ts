import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminJoin";
import type { IShoppingMallCountry } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCountry";
import type { IShoppingMallRegion } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRegion";
import type { IShoppingMallRegionShippingPolicy } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRegionShippingPolicy";

/**
 * Toggle region shipping policy shipping allowance from allowed to blocked.
 *
 * This E2E test verifies that an administrator can update an existing
 * region-level shipping policy to switch the `is_shipping_allowed` flag from
 * `true` to `false` using the admin update endpoint.
 *
 * Business flow covered:
 *
 * 1. Register an admin account to obtain an authenticated admin context.
 * 2. Create a country via the admin countries API.
 * 3. Create a region under that country via the admin regions API.
 * 4. Create a region shipping policy for that region with `is_shipping_allowed =
 *    true` using the public shippingPolicies API.
 * 5. Call the admin shippingPolicies.update endpoint to set `is_shipping_allowed =
 *    false` and update notes with a block reason.
 * 6. Validate that the response reflects the toggled flag while retaining stable
 *    identifiers and that the `updated_at` timestamp has changed.
 */
export async function test_api_region_shipping_policy_update_toggle_shipping_allowed(
  connection: api.IConnection,
) {
  // 1. Register an admin to establish authenticated context
  const adminJoinBody = {
    email: `${RandomGenerator.alphabets(8)}@example.com`,
    password: "P@ssw0rd!", // satisfies password format
    href: "https://admin.example.com/join", // uri
    referrer: "https://admin.example.com/landing", // uri
    ip: "127.0.0.1", // ipv4
  } satisfies IShoppingMallAdminJoin.ICreate;

  const adminAuthorized: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminAuthorized);

  // 2. Create a country as admin
  const countryCode = RandomGenerator.alphabets(2).toUpperCase();
  const countryCreateBody = {
    country_code: countryCode,
    name_en: `Country ${countryCode}`,
    phone_code: "+82",
    is_active: true,
    sort_order: 1 satisfies number,
  } satisfies IShoppingMallCountry.ICreate;

  const country: IShoppingMallCountry =
    await api.functional.shoppingMall.admin.countries.create(connection, {
      body: countryCreateBody,
    });
  typia.assert(country);

  TestValidator.equals(
    "created country_code should match input",
    country.country_code,
    countryCode,
  );

  // 3. Create a region under that country
  const regionCode = RandomGenerator.alphabets(5).toUpperCase();
  const regionCreateBody = {
    code: regionCode,
    name_en: `Region ${regionCode}`,
    region_type: "city",
    is_active: true,
    sort_order: 1 satisfies number,
  } satisfies IShoppingMallRegion.ICreate;

  const region: IShoppingMallRegion =
    await api.functional.shoppingMall.admin.countries.regions.create(
      connection,
      {
        countryCode,
        body: regionCreateBody,
      },
    );
  typia.assert(region);

  TestValidator.equals(
    "region country summary country_code should match parent",
    region.country.country_code,
    countryCode,
  );
  TestValidator.equals(
    "region code should match input",
    region.code,
    regionCode,
  );

  // 4. Create an initial shipping policy with is_shipping_allowed = true
  const policyCreateBody = {
    policy_name: `Policy ${RandomGenerator.alphabets(6)}`,
    shipping_method_group: null,
    min_order_amount: null,
    max_order_amount: null,
    allows_cod: true,
    is_shipping_allowed: true,
    notes: RandomGenerator.paragraph({ sentences: 4 }),
    effective_from: null,
    effective_until: null,
  } satisfies IShoppingMallRegionShippingPolicy.ICreate;

  const createdPolicy: IShoppingMallRegionShippingPolicy =
    await api.functional.shoppingMall.countries.regions.shippingPolicies.create(
      connection,
      {
        countryCode,
        regionCode,
        body: policyCreateBody,
      },
    );
  typia.assert(createdPolicy);

  TestValidator.equals(
    "created policy is_shipping_allowed should be true",
    createdPolicy.is_shipping_allowed,
    true,
  );
  TestValidator.equals(
    "created policy region code should match",
    createdPolicy.region.code,
    regionCode,
  );

  const originalUpdatedAt = createdPolicy.updated_at;

  // 5. Update the policy via admin endpoint to block shipping
  const blockNotes = RandomGenerator.paragraph({
    sentences: 6,
    wordMin: 4,
    wordMax: 10,
  });

  const updateBody = {
    is_shipping_allowed: false,
    notes: blockNotes,
  } satisfies IShoppingMallRegionShippingPolicy.IUpdate;

  const updatedPolicy: IShoppingMallRegionShippingPolicy =
    await api.functional.shoppingMall.admin.countries.regions.shippingPolicies.update(
      connection,
      {
        countryCode,
        regionCode,
        policyId: createdPolicy.id,
        body: updateBody,
      },
    );
  typia.assert(updatedPolicy);

  // 6. Validate toggling and field stability
  TestValidator.equals(
    "policy id should remain unchanged after update",
    updatedPolicy.id,
    createdPolicy.id,
  );
  TestValidator.equals(
    "shopping_mall_region_id should remain unchanged",
    updatedPolicy.shopping_mall_region_id,
    createdPolicy.shopping_mall_region_id,
  );
  TestValidator.equals(
    "region summary id should remain unchanged",
    updatedPolicy.region.id,
    createdPolicy.region.id,
  );
  TestValidator.equals(
    "is_shipping_allowed should now be false",
    updatedPolicy.is_shipping_allowed,
    false,
  );
  TestValidator.equals(
    "allows_cod should remain unchanged by this update",
    updatedPolicy.allows_cod,
    createdPolicy.allows_cod,
  );
  TestValidator.equals(
    "policy_name should remain unchanged when not updated",
    updatedPolicy.policy_name,
    createdPolicy.policy_name,
  );

  TestValidator.equals(
    "updated notes should match block reason",
    updatedPolicy.notes,
    blockNotes,
  );

  TestValidator.predicate("updated_at should change after update", () => {
    return updatedPolicy.updated_at !== originalUpdatedAt;
  });
}
