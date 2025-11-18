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
 * Validate creation of a region-level shipping policy with order amount
 * thresholds and a finite effective time window.
 *
 * Business steps:
 *
 * 1. Register an admin (POST /auth/admin/join) to obtain an authenticated admin
 *    context.
 * 2. Create an active country with a deterministic country_code (POST
 *    /shoppingMall/admin/countries).
 * 3. Under that country, create an active region with a deterministic code (POST
 *    /shoppingMall/admin/countries/{countryCode}/regions).
 * 4. Create a region shipping policy for that (countryCode, regionCode) pair (POST
 *    /shoppingMall/countries/{countryCode}/regions/{regionCode}/shippingPolicies)
 *    where:
 *
 *    - Allows_cod = false
 *    - Is_shipping_allowed = true
 *    - Min_order_amount > 0 and max_order_amount > min_order_amount
 *    - Shipping_method_group is a non-null string
 *    - Effective_from is in the recent past and effective_until is in the near
 *         future, so that the current time falls within [effective_from,
 *         effective_until]
 *    - Notes is set to a descriptive string
 * 5. Assert that the created IShoppingMallRegionShippingPolicy reflects these
 *    values, region summary matches the created region, the policy is currently
 *    active according to its window, min/max amounts are non-negative and
 *    ordered, and deleted_at is null while created_at <= updated_at.
 */
export async function test_api_region_shipping_policy_creation_with_amount_thresholds_and_window(
  connection: api.IConnection,
) {
  // 1. Register an admin to obtain authenticated admin context
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    ip: null,
    href: "https://admin.example.com/join",
    referrer: "https://admin.example.com/",
  } satisfies IShoppingMallAdminJoin.ICreate;

  const adminAuthorized: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert<IShoppingMallAdmin.IAuthorized>(adminAuthorized);
  typia.assert<IAuthorizationToken>(adminAuthorized.token);

  // 2. Create an active country with deterministic country_code
  const countryCode = `TST-${RandomGenerator.alphaNumeric(6)}`;
  const countryCreateBody = {
    country_code: countryCode,
    name_en: `Test Country ${RandomGenerator.name(1)}`,
    phone_code: "+82",
    is_active: true,
    sort_order: 1 satisfies number,
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
  TestValidator.predicate(
    "created country should be active",
    country.is_active === true,
  );

  // 3. Create an active region for that country
  const regionCode = `R-${RandomGenerator.alphaNumeric(5)}`;
  const regionCreateBody = {
    code: regionCode,
    name_en: `Region ${RandomGenerator.name(1)}`,
    region_type: "test-region",
    is_active: true,
    sort_order: 1 satisfies number,
  } satisfies IShoppingMallRegion.ICreate;

  const region: IShoppingMallRegion =
    await api.functional.shoppingMall.admin.countries.regions.create(
      connection,
      {
        countryCode: countryCode,
        body: regionCreateBody,
      },
    );
  typia.assert<IShoppingMallRegion>(region);

  TestValidator.equals(
    "created region code should match input",
    region.code,
    regionCode,
  );
  TestValidator.equals(
    "region country_code should match parent country",
    region.country.country_code,
    countryCode,
  );
  TestValidator.predicate(
    "created region should be active",
    region.is_active === true,
  );

  // 4. Create a region shipping policy with thresholds and effective window
  const now = new Date();
  const effectiveFrom = new Date(now.getTime() - 5 * 60 * 1000); // 5 minutes ago
  const effectiveUntil = new Date(now.getTime() + 60 * 60 * 1000); // 1 hour later

  const minOrderAmount = 50.0;
  const maxOrderAmount = 500.0;

  const policyCreateBody = {
    policy_name: `Policy-${RandomGenerator.alphaNumeric(8)}`,
    shipping_method_group: "DEFAULT-GROUP",
    min_order_amount: minOrderAmount,
    max_order_amount: maxOrderAmount,
    allows_cod: false,
    is_shipping_allowed: true,
    notes: "Limited-time region shipping policy for testing thresholds.",
    effective_from: effectiveFrom.toISOString(),
    effective_until: effectiveUntil.toISOString(),
  } satisfies IShoppingMallRegionShippingPolicy.ICreate;

  const policy: IShoppingMallRegionShippingPolicy =
    await api.functional.shoppingMall.countries.regions.shippingPolicies.create(
      connection,
      {
        countryCode: countryCode,
        regionCode: regionCode,
        body: policyCreateBody,
      },
    );
  typia.assert<IShoppingMallRegionShippingPolicy>(policy);

  // 5. Validate the created policy
  TestValidator.equals(
    "policy_name should be echoed back",
    policy.policy_name,
    policyCreateBody.policy_name,
  );
  TestValidator.equals("allows_cod should be false", policy.allows_cod, false);
  TestValidator.equals(
    "is_shipping_allowed should be true",
    policy.is_shipping_allowed,
    true,
  );
  TestValidator.equals(
    "shipping_method_group should match",
    policy.shipping_method_group,
    policyCreateBody.shipping_method_group ?? null,
  );
  TestValidator.equals(
    "min_order_amount should match",
    policy.min_order_amount,
    policyCreateBody.min_order_amount ?? null,
  );
  TestValidator.equals(
    "max_order_amount should match",
    policy.max_order_amount,
    policyCreateBody.max_order_amount ?? null,
  );
  TestValidator.equals(
    "notes should match",
    policy.notes,
    policyCreateBody.notes ?? null,
  );

  // min/max amount invariants
  if (
    policy.min_order_amount !== null &&
    policy.min_order_amount !== undefined
  ) {
    TestValidator.predicate(
      "min_order_amount should be non-negative",
      policy.min_order_amount >= 0,
    );
  }
  if (
    policy.max_order_amount !== null &&
    policy.max_order_amount !== undefined
  ) {
    TestValidator.predicate(
      "max_order_amount should be non-negative",
      policy.max_order_amount >= 0,
    );
  }
  if (
    policy.min_order_amount !== null &&
    policy.min_order_amount !== undefined &&
    policy.max_order_amount !== null &&
    policy.max_order_amount !== undefined
  ) {
    TestValidator.predicate(
      "min_order_amount should be <= max_order_amount",
      policy.min_order_amount <= policy.max_order_amount,
    );
  }

  // effective window invariants: effective_from <= now <= effective_until
  if (
    policy.effective_from !== null &&
    policy.effective_from !== undefined &&
    policy.effective_until !== null &&
    policy.effective_until !== undefined
  ) {
    const parsedFrom = new Date(policy.effective_from);
    const parsedUntil = new Date(policy.effective_until);

    TestValidator.predicate(
      "effective_from should be <= effective_until",
      parsedFrom.getTime() <= parsedUntil.getTime(),
    );

    const nowTime = now.getTime();
    TestValidator.predicate(
      "now should be within [effective_from, effective_until]",
      parsedFrom.getTime() <= nowTime && nowTime <= parsedUntil.getTime(),
    );
  }

  // Region summary should match
  TestValidator.equals(
    "policy.region.code should match created region code",
    policy.region.code,
    region.code,
  );
  TestValidator.equals(
    "policy.region.name_en should match created region name_en",
    policy.region.name_en,
    region.name_en,
  );
  TestValidator.equals(
    "policy.region.is_active should match created region is_active",
    policy.region.is_active,
    region.is_active,
  );
  TestValidator.equals(
    "policy.region.country.country_code should match parent countryCode",
    policy.region.country.country_code,
    countryCode,
  );

  // Lifecycle fields
  TestValidator.equals(
    "deleted_at should be null or undefined for new policy",
    policy.deleted_at ?? null,
    null,
  );

  const createdAt = new Date(policy.created_at);
  const updatedAt = new Date(policy.updated_at);
  TestValidator.predicate(
    "created_at should be <= updated_at",
    createdAt.getTime() <= updatedAt.getTime(),
  );
}
