import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallProductComplianceFlag } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallProductComplianceFlag";
import type { IShoppingMallAgeRestrictionPolicy } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAgeRestrictionPolicy";
import type { IShoppingMallBrand } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallBrand";
import type { IShoppingMallCancellationPolicy } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCancellationPolicy";
import type { IShoppingMallCategoryTree } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategoryTree";
import type { IShoppingMallPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdmin";
import type { IShoppingMallPlatformAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdminJoin";
import type { IShoppingMallPolicySetting } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPolicySetting";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductComplianceFlag } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductComplianceFlag";
import type { IShoppingMallRefundPolicy } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRefundPolicy";
import type { IShoppingMallRegionSetting } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRegionSetting";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";

/**
 * Validate filtered and paginated search of product compliance flags.
 *
 * Business goal
 *
 * - Ensure that platform admin can search compliance flags for a specific product
 *   using flag_type, is_blocking_sale, and created date range filters.
 * - Ensure that pagination (page, limit) behaves correctly and that relaxing
 *   filters returns a superset including both blocking and non-blocking flags.
 *
 * Scenario steps
 *
 * 1. Join as a platform admin to obtain an authorized connection.
 * 2. Create a policy setting profile (category "age_restriction").
 * 3. Create a region setting.
 * 4. Create an age restriction policy associated with the policy setting and
 *    region setting.
 * 5. Create a brand.
 * 6. Create a product associated with a random seller id and the brand.
 * 7. Create three compliance flags for the product:
 *
 *    - Age_restriction, blocking sale, linked to age restriction policy.
 *    - Hazardous_material, non-blocking.
 *    - Region_restricted, blocking.
 * 8. Call the complianceFlags.index endpoint with filters flag_type =
 *    "age_restriction", is_blocking_sale = true, page = 0, limit = 1, and
 *    created_from/created_to equal to the age_restriction flag's created_at.
 *    Verify:
 *
 *    - Only one record is returned.
 *    - The record has the expected flag_type and is_blocking_sale.
 *    - Pagination metadata (current, limit) matches the request.
 * 9. Because only one age_restriction blocking flag exists in this setup, assert
 *    that pagination.pages and pagination.records are both 1.
 * 10. Call index again with relaxed filters (flag_type and is_blocking_sale both
 *     null, page = 0, limit large enough) and verify:
 *
 *     - At least three flags are returned.
 *     - There exists at least one age_restriction, one hazardous_material, and one
 *           region_restricted flag.
 * 11. Call index with flag_type = "hazardous_material" and is_blocking_sale = false
 *     and verify that only hazardous flags are returned and all respect the
 *     filter.
 */
export async function test_api_product_compliance_flags_search_with_filters_and_pagination(
  connection: api.IConnection,
) {
  // 1. Join as platform admin
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    name: RandomGenerator.name(),
    password: RandomGenerator.alphaNumeric(12),
    ip: null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallPlatformAdminJoin.IRequest;

  const admin: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: joinBody,
    });
  typia.assert(admin);

  // 2. Create policy setting (age_restriction category)
  const policySettingBody = {
    code: `age_policy_${RandomGenerator.alphaNumeric(8)}`,
    name: RandomGenerator.name(),
    category: "age_restriction",
    description: RandomGenerator.paragraph({ sentences: 4 }),
    config_payload: undefined,
    active: true,
    effective_from: null,
    effective_to: null,
  } satisfies IShoppingMallPolicySetting.ICreate;

  const policySetting: IShoppingMallPolicySetting =
    await api.functional.shoppingMall.platformAdmin.policySettings.create(
      connection,
      { body: policySettingBody },
    );
  typia.assert(policySetting);

  // 3. Create region setting
  const regionBody = {
    code: `region_${RandomGenerator.alphaNumeric(6)}`,
    name: RandomGenerator.name(2),
    iso_country_code: "US",
    currency_code: "USD",
    timezone: "America/New_York",
    active: true,
  } satisfies IShoppingMallRegionSetting.ICreate;

  const region: IShoppingMallRegionSetting =
    await api.functional.shoppingMall.platformAdmin.regionSettings.create(
      connection,
      { body: regionBody },
    );
  typia.assert(region);

  // 4. Create age restriction policy linked to region and policy setting
  const agePolicyBody = {
    code: `age_flag_${RandomGenerator.alphaNumeric(6)}`,
    name: RandomGenerator.name(2),
    description: RandomGenerator.paragraph({ sentences: 3 }),
    minimum_age_years: 18 as number & tags.Type<"int32">,
    require_verified_age: true,
    config_payload: undefined,
    active: true,
    effective_from: null,
    effective_to: null,
    region_setting_id: region.id,
    policy_setting_id: policySetting.id,
  } satisfies IShoppingMallAgeRestrictionPolicy.ICreate;

  const agePolicy: IShoppingMallAgeRestrictionPolicy =
    await api.functional.shoppingMall.platformAdmin.ageRestrictionPolicies.create(
      connection,
      { body: agePolicyBody },
    );
  typia.assert(agePolicy);

  // 5. Create brand
  const brandBody = {
    name: RandomGenerator.name(2),
    slug: `brand-${RandomGenerator.alphaNumeric(8)}`,
    description: RandomGenerator.paragraph({ sentences: 3 }),
    logo_uri: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallBrand.ICreate;

  const brand: IShoppingMallBrand =
    await api.functional.shoppingMall.platformAdmin.brands.create(connection, {
      body: brandBody,
    });
  typia.assert(brand);

  // 6. Create product associated with random seller id and created brand
  const sellerId = typia.random<string & tags.Format<"uuid">>();
  const productCode = `prod_${RandomGenerator.alphaNumeric(10)}` as string &
    tags.MinLength<1>;

  const productBody = {
    shopping_mall_seller_id: sellerId,
    shopping_mall_brand_id: brand.id,
    code: productCode,
    name: RandomGenerator.name(3) as string & tags.MinLength<1>,
    short_description: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.content({ paragraphs: 2 }),
    status: "active" as string & tags.MinLength<1>,
    is_multi_sku: false,
    primary_image_uri: typia.random<string & tags.Format<"uri">>(),
    additional_data: null,
  } satisfies IShoppingMallProduct.ICreate;

  const product: IShoppingMallProduct =
    await api.functional.shoppingMall.platformAdmin.products.create(
      connection,
      { body: productBody },
    );
  typia.assert(product);

  // 7. Create three compliance flags
  // 7-1. Age restriction flag (blocking, linked to age policy)
  const ageFlagCreateBody = {
    shopping_mall_age_restriction_policy_id: agePolicy.id,
    flag_type: "age_restriction",
    flag_value: "18+",
    is_blocking_sale: true,
    notes: RandomGenerator.paragraph({ sentences: 2 }),
  } satisfies IShoppingMallProductComplianceFlag.ICreate;

  const ageFlag: IShoppingMallProductComplianceFlag =
    await api.functional.shoppingMall.platformAdmin.products.complianceFlags.create(
      connection,
      {
        productCode: product.code,
        body: ageFlagCreateBody,
      },
    );
  typia.assert(ageFlag);

  // 7-2. Hazardous material flag (non-blocking)
  const hazFlagCreateBody = {
    shopping_mall_age_restriction_policy_id: null,
    flag_type: "hazardous_material",
    flag_value: "flammable",
    is_blocking_sale: false,
    notes: RandomGenerator.paragraph({ sentences: 2 }),
  } satisfies IShoppingMallProductComplianceFlag.ICreate;

  const hazFlag: IShoppingMallProductComplianceFlag =
    await api.functional.shoppingMall.platformAdmin.products.complianceFlags.create(
      connection,
      {
        productCode: product.code,
        body: hazFlagCreateBody,
      },
    );
  typia.assert(hazFlag);

  // 7-3. Region restricted flag (blocking)
  const regionFlagCreateBody = {
    shopping_mall_age_restriction_policy_id: null,
    flag_type: "region_restricted",
    flag_value: region.code,
    is_blocking_sale: true,
    notes: RandomGenerator.paragraph({ sentences: 2 }),
  } satisfies IShoppingMallProductComplianceFlag.ICreate;

  const regionFlag: IShoppingMallProductComplianceFlag =
    await api.functional.shoppingMall.platformAdmin.products.complianceFlags.create(
      connection,
      {
        productCode: product.code,
        body: regionFlagCreateBody,
      },
    );
  typia.assert(regionFlag);

  // Sanity check: three flags created for this product
  TestValidator.predicate(
    "three compliance flags created",
    () => !!ageFlag && !!hazFlag && !!regionFlag,
  );

  // 8. Filter by age_restriction & blocking, with tight created_at window and pagination limit = 1
  const createdAtWindow = ageFlag.created_at;

  const filteredPage: IPageIShoppingMallProductComplianceFlag.ISummary =
    await api.functional.shoppingMall.platformAdmin.products.complianceFlags.index(
      connection,
      {
        productCode: product.code,
        body: {
          page: 0 as number & tags.Type<"int32">,
          limit: 1 as number & tags.Type<"int32">,
          flag_type: "age_restriction",
          is_blocking_sale: true,
          created_from: createdAtWindow,
          created_to: createdAtWindow,
          order_by: "created_at",
          order_direction: "asc",
        } satisfies IShoppingMallProductComplianceFlag.IRequest,
      },
    );
  typia.assert(filteredPage);

  const pagination: IPage.IPagination = filteredPage.pagination;
  typia.assert(pagination);

  TestValidator.equals(
    "pagination.limit equals requested limit for age filter",
    pagination.limit,
    1,
  );
  TestValidator.equals(
    "pagination.current equals requested page index for age filter",
    pagination.current,
    0,
  );

  TestValidator.predicate(
    "at least one age_restriction blocking flag returned",
    filteredPage.data.length >= 1,
  );

  const firstAgeFlag = filteredPage.data[0];
  TestValidator.equals(
    "first flag_type is age_restriction",
    firstAgeFlag.flag_type,
    "age_restriction",
  );
  TestValidator.equals(
    "first is_blocking_sale is true",
    firstAgeFlag.is_blocking_sale,
    true,
  );

  // Ensure no non-age types appear in this filtered result
  for (const item of filteredPage.data) {
    TestValidator.equals(
      "all filtered items have flag_type age_restriction",
      item.flag_type,
      "age_restriction",
    );
    TestValidator.equals(
      "all filtered items are blocking sale",
      item.is_blocking_sale,
      true,
    );
  }

  // With our setup, we expect exactly one matching flag
  TestValidator.equals(
    "records count for age_restriction blocking flags is 1",
    pagination.records,
    1,
  );
  TestValidator.equals(
    "pages count for age_restriction blocking flags is 1",
    pagination.pages,
    1,
  );

  // 10. Relax filters: include all flags regardless of type or blocking status
  const unfilteredPage: IPageIShoppingMallProductComplianceFlag.ISummary =
    await api.functional.shoppingMall.platformAdmin.products.complianceFlags.index(
      connection,
      {
        productCode: product.code,
        body: {
          page: 0 as number & tags.Type<"int32">,
          limit: 10 as number & tags.Type<"int32">,
          flag_type: null,
          is_blocking_sale: null,
          created_from: null,
          created_to: null,
          order_by: "created_at",
          order_direction: "asc",
        } satisfies IShoppingMallProductComplianceFlag.IRequest,
      },
    );
  typia.assert(unfilteredPage);

  const unfilteredPagination: IPage.IPagination = unfilteredPage.pagination;
  typia.assert(unfilteredPagination);

  TestValidator.predicate(
    "unfiltered result has at least three flags",
    unfilteredPage.data.length >= 3 && unfilteredPagination.records >= 3,
  );

  const hasAgeRestriction = unfilteredPage.data.some(
    (f) => f.flag_type === "age_restriction" && f.is_blocking_sale === true,
  );
  const hasHazardous = unfilteredPage.data.some(
    (f) => f.flag_type === "hazardous_material" && f.is_blocking_sale === false,
  );
  const hasRegionRestricted = unfilteredPage.data.some(
    (f) => f.flag_type === "region_restricted" && f.is_blocking_sale === true,
  );

  TestValidator.predicate(
    "unfiltered result includes age_restriction blocking flag",
    hasAgeRestriction,
  );
  TestValidator.predicate(
    "unfiltered result includes hazardous_material non-blocking flag",
    hasHazardous,
  );
  TestValidator.predicate(
    "unfiltered result includes region_restricted blocking flag",
    hasRegionRestricted,
  );

  // 11. Filter specifically for hazardous_material non-blocking flags
  const hazardousPage: IPageIShoppingMallProductComplianceFlag.ISummary =
    await api.functional.shoppingMall.platformAdmin.products.complianceFlags.index(
      connection,
      {
        productCode: product.code,
        body: {
          page: 0 as number & tags.Type<"int32">,
          limit: 5 as number & tags.Type<"int32">,
          flag_type: "hazardous_material",
          is_blocking_sale: false,
          created_from: null,
          created_to: null,
          order_by: "created_at",
          order_direction: "asc",
        } satisfies IShoppingMallProductComplianceFlag.IRequest,
      },
    );
  typia.assert(hazardousPage);

  TestValidator.predicate(
    "hazardous filter returns at least one flag",
    hazardousPage.data.length >= 1,
  );

  for (const item of hazardousPage.data) {
    TestValidator.equals(
      "hazardous filter returns only hazardous_material flags",
      item.flag_type,
      "hazardous_material",
    );
    TestValidator.equals(
      "hazardous filter returns only non-blocking flags",
      item.is_blocking_sale,
      false,
    );
  }
}
