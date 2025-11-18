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
 * Update a region shipping policy to change thresholds and COD flag.
 *
 * Business flow:
 *
 * 1. Join an admin account and obtain authentication via POST /auth/admin/join.
 * 2. As the admin, create a country via POST /shoppingMall/admin/countries.
 * 3. Under that country, create a region via POST
 *    /shoppingMall/admin/countries/{countryCode}/regions.
 * 4. Create an initial region shipping policy via POST
 *    /shoppingMall/countries/{countryCode}/regions/{regionCode}/shippingPolicies
 *    with a known policy_name and initial thresholds/COD settings.
 * 5. Update the shipping policy via PUT
 *    /shoppingMall/admin/countries/{countryCode}/regions/{regionCode}/shippingPolicies/{policyId}
 *    to disable COD and tighten min/max order amount thresholds, and adjust
 *    notes/effective_until.
 * 6. Verify that:
 *
 *    - Id is unchanged between create and update responses.
 *    - Shopping_mall_region_id and region summary remain bound to the same region.
 *    - Allows_cod, min_order_amount, max_order_amount, notes, and effective_until
 *         reflect the updated values.
 *    - Created_at is unchanged and updated_at is strictly greater than created_at.
 */
export async function test_api_region_shipping_policy_update_change_thresholds_and_cod_flag(
  connection: api.IConnection,
) {
  // 1. Admin join (authentication context is handled by SDK)
  const adminJoinBody = {
    email: `${RandomGenerator.alphabets(8)}@example.com`,
    password: "P@ssw0rd",
    href: "https://admin.example.com/join",
    referrer: "https://admin.example.com/landing",
    ip: "127.0.0.1",
  } satisfies IShoppingMallAdminJoin.ICreate;

  const adminAuthorized: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminAuthorized);

  // 2. Create a country
  const countryCode: string = RandomGenerator.alphabets(2).toUpperCase();
  const countryCreateBody = {
    country_code: countryCode,
    name_en: `Country ${RandomGenerator.name(1)}`,
    phone_code: "+82",
    is_active: true,
    sort_order: 1,
  } satisfies IShoppingMallCountry.ICreate;

  const country: IShoppingMallCountry =
    await api.functional.shoppingMall.admin.countries.create(connection, {
      body: countryCreateBody,
    });
  typia.assert(country);

  TestValidator.equals(
    "created country_code should match request",
    country.country_code,
    countryCode,
  );

  // 3. Create a region under the country
  const regionCode: string = RandomGenerator.alphabets(4).toUpperCase();
  const regionCreateBody = {
    code: regionCode,
    name_en: `Region ${RandomGenerator.name(1)}`,
    region_type: "province",
    is_active: true,
    sort_order: 1,
  } satisfies IShoppingMallRegion.ICreate;

  const region: IShoppingMallRegion =
    await api.functional.shoppingMall.admin.countries.regions.create(
      connection,
      {
        countryCode: countryCode,
        body: regionCreateBody,
      },
    );
  typia.assert(region);

  TestValidator.equals(
    "created region code should match request",
    region.code,
    regionCode,
  );
  TestValidator.equals(
    "region country_code should match country",
    region.country.country_code,
    countryCode,
  );

  // 4. Create initial region shipping policy (public countries endpoint)
  const initialPolicyName = "UPDATABLE-POLICY";
  const initialMinAmount = 0;
  const initialMaxAmount = null;

  const now = new Date();
  const effectiveFrom: string | null = null;
  const initialNotes = "Initial policy notes";

  const policyCreateBody = {
    policy_name: initialPolicyName,
    shipping_method_group: "STANDARD",
    min_order_amount: initialMinAmount,
    max_order_amount: initialMaxAmount,
    allows_cod: true,
    is_shipping_allowed: true,
    notes: initialNotes,
    effective_from: effectiveFrom,
    effective_until: null,
  } satisfies IShoppingMallRegionShippingPolicy.ICreate;

  const createdPolicy: IShoppingMallRegionShippingPolicy =
    await api.functional.shoppingMall.countries.regions.shippingPolicies.create(
      connection,
      {
        countryCode: countryCode,
        regionCode: regionCode,
        body: policyCreateBody,
      },
    );
  typia.assert(createdPolicy);

  TestValidator.equals(
    "created policy_name should match request",
    createdPolicy.policy_name,
    initialPolicyName,
  );
  TestValidator.equals(
    "created policy region code should match",
    createdPolicy.region.code,
    regionCode,
  );
  TestValidator.equals(
    "created policy region country_code should match",
    createdPolicy.region.country.country_code,
    countryCode,
  );

  const originalPolicyId = createdPolicy.id;
  const originalRegionId = createdPolicy.shopping_mall_region_id;
  const originalCreatedAt = createdPolicy.created_at;
  const originalUpdatedAt = createdPolicy.updated_at;

  // 5. Update the shipping policy via admin endpoint
  const updatedMinAmount = 100;
  const updatedMaxAmount = 1000;
  const updatedNotes = "Updated policy for higher order thresholds";

  // effective_until: a future time (e.g., +7 days)
  const futureDate = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  const updatedEffectiveUntil = futureDate.toISOString();

  const updateBody = {
    // keep policy_name the same to focus on thresholds/COD, but still send to test round-trip
    policy_name: initialPolicyName,
    shipping_method_group: createdPolicy.shipping_method_group ?? null,
    min_order_amount: updatedMinAmount,
    max_order_amount: updatedMaxAmount,
    allows_cod: false,
    is_shipping_allowed: true,
    notes: updatedNotes,
    effective_from: createdPolicy.effective_from ?? null,
    effective_until: updatedEffectiveUntil,
  } satisfies IShoppingMallRegionShippingPolicy.IUpdate;

  const updatedPolicy: IShoppingMallRegionShippingPolicy =
    await api.functional.shoppingMall.admin.countries.regions.shippingPolicies.update(
      connection,
      {
        countryCode: countryCode,
        regionCode: regionCode,
        policyId: originalPolicyId,
        body: updateBody,
      },
    );
  typia.assert(updatedPolicy);

  // 6. Business validations on update response
  TestValidator.equals(
    "policy id should remain unchanged after update",
    updatedPolicy.id,
    originalPolicyId,
  );
  TestValidator.equals(
    "shopping_mall_region_id should remain bound to same region",
    updatedPolicy.shopping_mall_region_id,
    originalRegionId,
  );
  TestValidator.equals(
    "region code should remain unchanged after update",
    updatedPolicy.region.code,
    regionCode,
  );
  TestValidator.equals(
    "region country_code should remain unchanged after update",
    updatedPolicy.region.country.country_code,
    countryCode,
  );

  TestValidator.equals(
    "allows_cod should be updated to false",
    updatedPolicy.allows_cod,
    false,
  );
  TestValidator.equals(
    "is_shipping_allowed should remain true",
    updatedPolicy.is_shipping_allowed,
    true,
  );

  TestValidator.equals(
    "min_order_amount should be updated",
    updatedPolicy.min_order_amount,
    updatedMinAmount,
  );
  TestValidator.equals(
    "max_order_amount should be updated",
    updatedPolicy.max_order_amount,
    updatedMaxAmount,
  );

  TestValidator.equals(
    "policy_name should remain the same after update",
    updatedPolicy.policy_name,
    initialPolicyName,
  );

  TestValidator.equals(
    "notes should be updated",
    updatedPolicy.notes,
    updatedNotes,
  );

  TestValidator.equals(
    "effective_until should be updated to future date",
    updatedPolicy.effective_until,
    updatedEffectiveUntil,
  );

  // created_at should be unchanged; updated_at should be later than original
  TestValidator.equals(
    "created_at should remain unchanged after update",
    updatedPolicy.created_at,
    originalCreatedAt,
  );

  const createdAtTime = Date.parse(originalCreatedAt);
  const updatedAtTime = Date.parse(updatedPolicy.updated_at);

  await TestValidator.predicate(
    "updated_at should be strictly greater than original updated_at",
    async () => updatedAtTime > Date.parse(originalUpdatedAt),
  );

  await TestValidator.predicate(
    "updated_at should be greater than or equal to created_at",
    async () => updatedAtTime >= createdAtTime,
  );
}
