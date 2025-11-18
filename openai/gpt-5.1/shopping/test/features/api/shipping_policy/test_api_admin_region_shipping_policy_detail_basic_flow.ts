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
 * Validate that an authenticated admin can create and then retrieve a specific
 * region shipping policy with full detail.
 *
 * Business flow:
 *
 * 1. Admin joins (POST /auth/admin/join) and obtains JWT via SDK side-effect.
 * 2. Admin creates a country (POST /shoppingMall/admin/countries).
 * 3. Admin creates a region under that country (POST
 *    /shoppingMall/admin/countries/{countryCode}/regions).
 * 4. Admin creates a region shipping policy under that region (POST
 *    /shoppingMall/countries/{countryCode}/regions/{regionCode}/shippingPolicies)
 *    using clear, deterministic values.
 * 5. Admin retrieves the same policy by ID using GET
 *    /shoppingMall/countries/{countryCode}/regions/{regionCode}/shippingPolicies/{policyId}.
 * 6. The test asserts that all important configuration fields and region context
 *    are persisted and returned correctly, and that audit fields look logically
 *    consistent.
 */
export async function test_api_admin_region_shipping_policy_detail_basic_flow(
  connection: api.IConnection,
) {
  // 1. Admin joins
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    href: "https://admin.console.example.com/join",
    referrer: "https://admin.console.example.com/landing",
    ip: typia.random<string & tags.Format<"ipv4">>(),
  } satisfies IShoppingMallAdminJoin.ICreate;

  const adminAuthorized: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: joinBody,
    });
  typia.assert<IShoppingMallAdmin.IAuthorized>(adminAuthorized);

  // 2. Create a country with a deterministic country code
  const countryCode = `CTY-${RandomGenerator.alphaNumeric(6).toUpperCase()}`;

  const countryBody = {
    country_code: countryCode,
    name_en: "Testland",
    phone_code: "+999",
    is_active: true,
    sort_order: 1 satisfies number & tags.Type<"int32">,
  } satisfies IShoppingMallCountry.ICreate;

  const country: IShoppingMallCountry =
    await api.functional.shoppingMall.admin.countries.create(connection, {
      body: countryBody,
    });
  typia.assert<IShoppingMallCountry>(country);

  TestValidator.equals(
    "created country_code should match request",
    country.country_code,
    countryCode,
  );

  // 3. Create a region under that country
  const regionCode = `REG-${RandomGenerator.alphaNumeric(6).toUpperCase()}`;

  const regionBody = {
    code: regionCode,
    name_en: "Central District",
    region_type: "city",
    is_active: true,
    sort_order: 1 satisfies number & tags.Type<"int32">,
  } satisfies IShoppingMallRegion.ICreate;

  const region: IShoppingMallRegion =
    await api.functional.shoppingMall.admin.countries.regions.create(
      connection,
      {
        countryCode,
        body: regionBody,
      },
    );
  typia.assert<IShoppingMallRegion>(region);

  TestValidator.equals(
    "created region code should match request",
    region.code,
    regionCode,
  );
  TestValidator.equals(
    "created region country_code should align with parent country",
    region.country.country_code,
    countryCode,
  );

  // 4. Create a region shipping policy with deterministic values
  const now = new Date();
  const effectiveFrom = new Date(now.getTime() + 60 * 60 * 1000).toISOString(); // +1h
  const effectiveUntil = new Date(
    now.getTime() + 24 * 60 * 60 * 1000,
  ).toISOString(); // +1d

  const createPolicyBody = {
    policy_name: "Standard Test Policy",
    shipping_method_group: "STANDARD_GROUP",
    min_order_amount: 100,
    max_order_amount: 1000,
    allows_cod: true,
    is_shipping_allowed: true,
    notes: "Policy for automated E2E test.",
    effective_from: effectiveFrom,
    effective_until: effectiveUntil,
  } satisfies IShoppingMallRegionShippingPolicy.ICreate;

  const createdPolicy: IShoppingMallRegionShippingPolicy =
    await api.functional.shoppingMall.countries.regions.shippingPolicies.create(
      connection,
      {
        countryCode,
        regionCode,
        body: createPolicyBody,
      },
    );
  typia.assert<IShoppingMallRegionShippingPolicy>(createdPolicy);

  // Basic sanity checks on creation
  TestValidator.equals(
    "created policy_name should match request",
    createdPolicy.policy_name,
    createPolicyBody.policy_name,
  );
  TestValidator.equals(
    "created policy region.code should match regionCode",
    createdPolicy.region.code,
    regionCode,
  );
  TestValidator.equals(
    "created policy region.country.country_code should match countryCode",
    createdPolicy.region.country.country_code,
    countryCode,
  );

  // 5. Capture policyId
  const policyId = createdPolicy.id;

  // 6. Retrieve policy detail via GET
  const fetchedPolicy: IShoppingMallRegionShippingPolicy =
    await api.functional.shoppingMall.countries.regions.shippingPolicies.at(
      connection,
      {
        countryCode,
        regionCode,
        policyId,
      },
    );
  typia.assert<IShoppingMallRegionShippingPolicy>(fetchedPolicy);

  // 7 & 8. Compare configuration fields between created and fetched
  TestValidator.equals(
    "fetched policy_name matches created",
    fetchedPolicy.policy_name,
    createPolicyBody.policy_name,
  );
  TestValidator.equals(
    "fetched shipping_method_group matches created",
    fetchedPolicy.shipping_method_group,
    createPolicyBody.shipping_method_group,
  );
  TestValidator.equals(
    "fetched allows_cod matches created",
    fetchedPolicy.allows_cod,
    createPolicyBody.allows_cod,
  );
  TestValidator.equals(
    "fetched is_shipping_allowed matches created",
    fetchedPolicy.is_shipping_allowed,
    createPolicyBody.is_shipping_allowed,
  );
  TestValidator.equals(
    "fetched min_order_amount matches created",
    fetchedPolicy.min_order_amount,
    createPolicyBody.min_order_amount,
  );
  TestValidator.equals(
    "fetched max_order_amount matches created",
    fetchedPolicy.max_order_amount,
    createPolicyBody.max_order_amount,
  );
  TestValidator.equals(
    "fetched notes matches created",
    fetchedPolicy.notes,
    createPolicyBody.notes,
  );
  TestValidator.equals(
    "fetched effective_from matches created",
    fetchedPolicy.effective_from,
    createPolicyBody.effective_from,
  );
  TestValidator.equals(
    "fetched effective_until matches created",
    fetchedPolicy.effective_until,
    createPolicyBody.effective_until,
  );

  // 9. Validate embedded region summary alignment
  TestValidator.equals(
    "fetched region summary code equals regionCode",
    fetchedPolicy.region.code,
    regionCode,
  );
  TestValidator.equals(
    "fetched region summary country_code equals countryCode",
    fetchedPolicy.region.country.country_code,
    countryCode,
  );

  // 10. Audit field checks
  // created_at and updated_at should exist and be logically consistent
  const createdAt = new Date(fetchedPolicy.created_at);
  const updatedAt = new Date(fetchedPolicy.updated_at);

  TestValidator.predicate(
    "created_at should be valid date",
    () => !Number.isNaN(createdAt.getTime()),
  );
  TestValidator.predicate(
    "updated_at should be valid date",
    () => !Number.isNaN(updatedAt.getTime()),
  );
  TestValidator.predicate(
    "created_at should be less than or equal to updated_at",
    () => createdAt.getTime() <= updatedAt.getTime(),
  );

  TestValidator.equals(
    "deleted_at should be null for active policy",
    fetchedPolicy.deleted_at,
    null,
  );
}
