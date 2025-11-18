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

export async function test_api_region_shipping_policy_update_preserve_region_scoping(
  connection: api.IConnection,
) {
  // 1. Admin joins and obtains authorization
  const adminJoinBody = {
    email: `${RandomGenerator.alphabets(8)}@example.com`,
    password: RandomGenerator.alphaNumeric(12),
    href: "https://admin.example.com/join",
    referrer: "https://admin.example.com/landing",
  } satisfies IShoppingMallAdminJoin.ICreate;

  const adminAuthorized: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert<IShoppingMallAdmin.IAuthorized>(adminAuthorized);

  // 2. Create a country
  const countryCode = `CTY-${RandomGenerator.alphabets(4).toUpperCase()}`;
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
  typia.assert<IShoppingMallCountry>(country);
  TestValidator.equals(
    "created country_code should match input",
    country.country_code,
    countryCode,
  );

  // 3. Create two regions under the same country: REGION-X and REGION-Y
  const regionXCode = "REGION-X";
  const regionXCreateBody = {
    code: regionXCode,
    name_en: `Region X ${RandomGenerator.name(1)}`,
    region_type: "business-region",
    is_active: true,
    sort_order: 1,
  } satisfies IShoppingMallRegion.ICreate;

  const regionX: IShoppingMallRegion =
    await api.functional.shoppingMall.admin.countries.regions.create(
      connection,
      {
        countryCode,
        body: regionXCreateBody,
      },
    );
  typia.assert<IShoppingMallRegion>(regionX);
  TestValidator.equals("region X code should match", regionX.code, regionXCode);
  TestValidator.equals(
    "region X country_code should match parent country",
    regionX.country.country_code,
    countryCode,
  );

  const regionYCode = "REGION-Y";
  const regionYCreateBody = {
    code: regionYCode,
    name_en: `Region Y ${RandomGenerator.name(1)}`,
    region_type: "business-region",
    is_active: true,
    sort_order: 2,
  } satisfies IShoppingMallRegion.ICreate;

  const regionY: IShoppingMallRegion =
    await api.functional.shoppingMall.admin.countries.regions.create(
      connection,
      {
        countryCode,
        body: regionYCreateBody,
      },
    );
  typia.assert<IShoppingMallRegion>(regionY);
  TestValidator.equals("region Y code should match", regionY.code, regionYCode);
  TestValidator.equals(
    "region Y country_code should match parent country",
    regionY.country.country_code,
    countryCode,
  );

  // 4. Create a shipping policy attached to REGION-X
  const originalPolicyName = "Policy X Original";
  const createPolicyBody = {
    policy_name: originalPolicyName,
    shipping_method_group: "STANDARD",
    min_order_amount: 100,
    max_order_amount: 100000,
    allows_cod: true,
    is_shipping_allowed: true,
    notes: "Initial policy for REGION-X",
    effective_from: new Date().toISOString(),
    effective_until: null,
  } satisfies IShoppingMallRegionShippingPolicy.ICreate;

  const createdPolicy: IShoppingMallRegionShippingPolicy =
    await api.functional.shoppingMall.countries.regions.shippingPolicies.create(
      connection,
      {
        countryCode,
        regionCode: regionXCode,
        body: createPolicyBody,
      },
    );
  typia.assert<IShoppingMallRegionShippingPolicy>(createdPolicy);

  TestValidator.equals(
    "created policy region code should be REGION-X",
    createdPolicy.region.code,
    regionXCode,
  );
  TestValidator.equals(
    "created policy region country_code should match",
    createdPolicy.region.country.country_code,
    countryCode,
  );
  TestValidator.equals(
    "created policy region id should match shopping_mall_region_id",
    createdPolicy.region.id,
    createdPolicy.shopping_mall_region_id,
  );

  const policyId = createdPolicy.id;

  // 5. Update the policy for REGION-X with new business fields
  const updatedPolicyName = "Policy X Updated";
  const updatedNotes = "Updated policy for REGION-X with new thresholds";
  const updatedMinOrderAmount = 200;
  const updatedMaxOrderAmount = 200000;
  const updatedEffectiveFrom = new Date(
    Date.now() + 60 * 60 * 1000,
  ).toISOString();
  const updatedEffectiveUntil = new Date(
    Date.now() + 7 * 24 * 60 * 60 * 1000,
  ).toISOString();

  const updateBody: IShoppingMallRegionShippingPolicy.IUpdate = {
    policy_name: updatedPolicyName,
    shipping_method_group: "EXPRESS",
    min_order_amount: updatedMinOrderAmount,
    max_order_amount: updatedMaxOrderAmount,
    allows_cod: false,
    is_shipping_allowed: true,
    notes: updatedNotes,
    effective_from: updatedEffectiveFrom,
    effective_until: updatedEffectiveUntil,
  };

  const updatedPolicy: IShoppingMallRegionShippingPolicy =
    await api.functional.shoppingMall.admin.countries.regions.shippingPolicies.update(
      connection,
      {
        countryCode,
        regionCode: regionXCode,
        policyId,
        body: updateBody,
      },
    );
  typia.assert<IShoppingMallRegionShippingPolicy>(updatedPolicy);

  // 6. Validate that identity and region scoping are preserved and fields updated
  TestValidator.equals(
    "policy id should remain unchanged after update",
    updatedPolicy.id,
    createdPolicy.id,
  );
  TestValidator.equals(
    "shopping_mall_region_id should remain unchanged after update",
    updatedPolicy.shopping_mall_region_id,
    createdPolicy.shopping_mall_region_id,
  );
  TestValidator.equals(
    "region.id should still refer to REGION-X",
    updatedPolicy.region.id,
    regionX.id,
  );
  TestValidator.equals(
    "region.code should still be REGION-X",
    updatedPolicy.region.code,
    regionXCode,
  );
  TestValidator.equals(
    "region.country.country_code should remain the same",
    updatedPolicy.region.country.country_code,
    countryCode,
  );

  TestValidator.equals(
    "policy_name should be updated",
    updatedPolicy.policy_name,
    updatedPolicyName,
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
    updatedMinOrderAmount,
  );
  TestValidator.equals(
    "max_order_amount should be updated",
    updatedPolicy.max_order_amount,
    updatedMaxOrderAmount,
  );
  TestValidator.equals(
    "notes should be updated",
    updatedPolicy.notes,
    updatedNotes,
  );
  TestValidator.equals(
    "effective_from should be updated",
    updatedPolicy.effective_from,
    updatedEffectiveFrom,
  );
  TestValidator.equals(
    "effective_until should be updated",
    updatedPolicy.effective_until,
    updatedEffectiveUntil,
  );

  // 7. Cross-region scoping attempt: try to update same policyId under REGION-Y
  let crossRegionSucceeded = false;
  let crossRegionPolicy: IShoppingMallRegionShippingPolicy | null = null;

  const crossRegionUpdateBody: IShoppingMallRegionShippingPolicy.IUpdate = {
    notes: "Cross-region update attempt",
  };

  try {
    crossRegionPolicy =
      await api.functional.shoppingMall.admin.countries.regions.shippingPolicies.update(
        connection,
        {
          countryCode,
          regionCode: regionYCode,
          policyId,
          body: crossRegionUpdateBody,
        },
      );
    typia.assert<IShoppingMallRegionShippingPolicy>(crossRegionPolicy);
    crossRegionSucceeded = true;
  } catch {
    crossRegionSucceeded = false;
  }

  if (crossRegionSucceeded && crossRegionPolicy !== null) {
    // If server allowed the call, verify that scoping is still bound to REGION-X
    TestValidator.equals(
      "cross-region update should not change shopping_mall_region_id",
      crossRegionPolicy.shopping_mall_region_id,
      createdPolicy.shopping_mall_region_id,
    );
    TestValidator.equals(
      "cross-region update should not change region.id",
      crossRegionPolicy.region.id,
      regionX.id,
    );
    TestValidator.equals(
      "cross-region update should not change region.code to REGION-Y",
      crossRegionPolicy.region.code,
      regionXCode,
    );
  }
}
