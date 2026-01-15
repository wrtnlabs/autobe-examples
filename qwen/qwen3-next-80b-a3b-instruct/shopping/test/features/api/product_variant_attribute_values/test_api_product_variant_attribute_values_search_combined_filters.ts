import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallVariantAttributeValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallVariantAttributeValue";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallProductVariantAttribute } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariantAttribute";
import type { IShoppingMallVariantAttributeValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallVariantAttributeValue";
import { prepare_random_shopping_mall_product_variant_attribute } from "../../../prepare/prepare_random_shopping_mall_product_variant_attribute";
import { prepare_random_shopping_mall_variant_attribute_value } from "../../../prepare/prepare_random_shopping_mall_variant_attribute_value";
import { generate_random_shopping_mall_admin_product_variants_attributes_create } from "../../../generate/generate_random_shopping_mall_admin_product_variants_attributes_create";
import { generate_random_shopping_mall_admin_product_variants_attribute_values_create } from "../../../generate/generate_random_shopping_mall_admin_product_variants_attribute_values_create";
import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
export async function test_api_product_variant_attribute_values_search_combined_filters(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Authenticate admin user
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: `https://example.com/admin/join-${RandomGenerator.alphaNumeric(6)}`,
      referrer: `https://example.com/admin/signup-${RandomGenerator.alphaNumeric(6)}`,
    } satisfies IShoppingMallAdmin.IJoin,
  });
  // Step 2: Create two distinct product variant attribute types
  const attribute1 =
    await generate_random_shopping_mall_admin_product_variants_attributes_create(
      adminConnection,
      {
        body: {
          name: "Color",
          description: "Product color options",
          type: "string",
        } satisfies IShoppingMallProductVariantAttribute.ICreate,
      },
    );
  typia.assert(attribute1);
  const attribute2 =
    await generate_random_shopping_mall_admin_product_variants_attributes_create(
      adminConnection,
      {
        body: {
          name: "Size",
          description: "Product size options",
          type: "string",
        } satisfies IShoppingMallProductVariantAttribute.ICreate,
      },
    );
  typia.assert(attribute2);
  // Step 3: Create attribute values for first attribute type with varying statuses and text values
  const activeRed =
    await generate_random_shopping_mall_admin_product_variants_attribute_values_create(
      adminConnection,
      {
        body: {
          attribute_type_id: attribute1.id,
          name: "Red",
        } satisfies IShoppingMallVariantAttributeValue.ICreate,
      },
    );
  typia.assert(activeRed);
  const activeBlue =
    await generate_random_shopping_mall_admin_product_variants_attribute_values_create(
      adminConnection,
      {
        body: {
          attribute_type_id: attribute1.id,
          name: "Blue",
        } satisfies IShoppingMallVariantAttributeValue.ICreate,
      },
    );
  typia.assert(activeBlue);
  const inactiveRed =
    await generate_random_shopping_mall_admin_product_variants_attribute_values_create(
      adminConnection,
      {
        body: {
          attribute_type_id: attribute1.id,
          name: "Red",
        } satisfies IShoppingMallVariantAttributeValue.ICreate,
      },
    );
  typia.assert(inactiveRed);
  const inactiveBlue =
    await generate_random_shopping_mall_admin_product_variants_attribute_values_create(
      adminConnection,
      {
        body: {
          attribute_type_id: attribute1.id,
          name: "Blue",
        } satisfies IShoppingMallVariantAttributeValue.ICreate,
      },
    );
  typia.assert(inactiveBlue);
  // Step 4: Create attribute values for second attribute type to test isolation
  const activeLarge =
    await generate_random_shopping_mall_admin_product_variants_attribute_values_create(
      adminConnection,
      {
        body: {
          attribute_type_id: attribute2.id,
          name: "Large",
        } satisfies IShoppingMallVariantAttributeValue.ICreate,
      },
    );
  typia.assert(activeLarge);
  const activeSmall =
    await generate_random_shopping_mall_admin_product_variants_attribute_values_create(
      adminConnection,
      {
        body: {
          attribute_type_id: attribute2.id,
          name: "Small",
        } satisfies IShoppingMallVariantAttributeValue.ICreate,
      },
    );
  typia.assert(activeSmall);
  // Step 5: Test search with combined filters (attr_id, value, status) to verify intersection results
  // Search for active "Red" values under attribute1
  const searchActiveRed =
    await api.functional.shoppingMall.product_variants.attribute_values.index(
      adminConnection,
      {
        body: {
          attr_id: attribute1.id,
          value: "Red",
          status: "active",
        } satisfies IShoppingMallVariantAttributeValue.IRequest,
      },
    );
  typia.assert(searchActiveRed);
  // Validate that only active Red values are returned
  TestValidator.equals(
    "active Red count should be 1",
    searchActiveRed.data.length,
    1,
  );
  TestValidator.equals(
    "active Red value name",
    searchActiveRed.data[0].value,
    "Red",
  );
  TestValidator.predicate(
    "active Red status is active",
    () => searchActiveRed.data[0].is_active === true,
  );
  // Test search with same attribute but different value
  const searchActiveBlue =
    await api.functional.shoppingMall.product_variants.attribute_values.index(
      adminConnection,
      {
        body: {
          attr_id: attribute1.id,
          value: "Blue",
          status: "active",
        } satisfies IShoppingMallVariantAttributeValue.IRequest,
      },
    );
  typia.assert(searchActiveBlue);
  TestValidator.equals(
    "active Blue count should be 1",
    searchActiveBlue.data.length,
    1,
  );
  TestValidator.equals(
    "active Blue value name",
    searchActiveBlue.data[0].value,
    "Blue",
  );
  // Step 6: Test pagination with limit parameter to ensure correct result set size
  // Create more attribute values to ensure pagination is needed
  const moreReds = ArrayUtil.repeat(5, () =>
    generate_random_shopping_mall_admin_product_variants_attribute_values_create(
      adminConnection,
      {
        body: {
          attribute_type_id: attribute1.id,
          name: `Red ${RandomGenerator.alphaNumeric(3)}`,
        } satisfies IShoppingMallVariantAttributeValue.ICreate,
      },
    ),
  );
  const moreRedsResults = await Promise.all(moreReds);
  typia.assert(moreRedsResults);
  // Search with limit of 3
  const searchWithLimit =
    await api.functional.shoppingMall.product_variants.attribute_values.index(
      adminConnection,
      {
        body: {
          attr_id: attribute1.id,
          status: "active",
          limit: 3,
        } satisfies IShoppingMallVariantAttributeValue.IRequest,
      },
    );
  typia.assert(searchWithLimit);
  TestValidator.equals(
    "pagination limit of 3 should return 3 results",
    searchWithLimit.data.length,
    3,
  );
  TestValidator.equals(
    "pagination should have correct total records",
    searchWithLimit.pagination.records,
    moreRedsResults.length + 2,
  ); // 5 new + 2 existing active
  TestValidator.equals(
    "pagination should show correct pages",
    searchWithLimit.pagination.pages,
    Math.ceil((moreRedsResults.length + 2) / 3),
  );
  // Step 7: Test zero-result scenarios with conflicting filters
  // Search for active Red values under the Size attribute (should return 0)
  const searchActiveRedWrongAttribute =
    await api.functional.shoppingMall.product_variants.attribute_values.index(
      adminConnection,
      {
        body: {
          attr_id: attribute2.id,
          value: "Red",
          status: "active",
        } satisfies IShoppingMallVariantAttributeValue.IRequest,
      },
    );
  typia.assert(searchActiveRedWrongAttribute);
  TestValidator.equals(
    "wrong attribute id should return 0 results",
    searchActiveRedWrongAttribute.data.length,
    0,
  );
  // Search for active status with value that doesn't exist (should return 0)
  const searchNonExistentValue =
    await api.functional.shoppingMall.product_variants.attribute_values.index(
      adminConnection,
      {
        body: {
          attr_id: attribute1.id,
          value: "NonExistentColor",
          status: "active",
        } satisfies IShoppingMallVariantAttributeValue.IRequest,
      },
    );
  typia.assert(searchNonExistentValue);
  TestValidator.equals(
    "non-existent value should return 0 results",
    searchNonExistentValue.data.length,
    0,
  );
  // Step 8: Validate correct handling of active/inactive status filtering
  // Search for all Red values regardless of status
  const searchAllReds =
    await api.functional.shoppingMall.product_variants.attribute_values.index(
      adminConnection,
      {
        body: {
          attr_id: attribute1.id,
          value: "Red",
        } satisfies IShoppingMallVariantAttributeValue.IRequest,
      },
    );
  typia.assert(searchAllReds);
  TestValidator.equals(
    "all Red values should include both active and inactive",
    searchAllReds.data.length,
    2,
  );
  TestValidator.predicate(
    "both active and inactive Red values exist",
    () =>
      searchAllReds.data.some((v) => v.is_active === true) &&
      searchAllReds.data.some((v) => v.is_active === false),
  );
  // Search for inactive Red values only
  const searchInactiveReds =
    await api.functional.shoppingMall.product_variants.attribute_values.index(
      adminConnection,
      {
        body: {
          attr_id: attribute1.id,
          value: "Red",
          status: "inactive",
        } satisfies IShoppingMallVariantAttributeValue.IRequest,
      },
    );
  typia.assert(searchInactiveReds);
  TestValidator.equals(
    "inactive Red count should be 1",
    searchInactiveReds.data.length,
    1,
  );
  TestValidator.equals(
    "inactive Red value name",
    searchInactiveReds.data[0].value,
    "Red",
  );
  TestValidator.predicate(
    "inactive Red status is inactive",
    () => searchInactiveReds.data[0].is_active === false,
  );
  // Step 9: Test attribute isolation - ensure search on attribute2 doesn't return attribute1 results
  const searchAttribute1OnAttribute2 =
    await api.functional.shoppingMall.product_variants.attribute_values.index(
      adminConnection,
      {
        body: {
          attr_id: attribute2.id,
          value: "Red", // This value doesn't belong to attribute2
        } satisfies IShoppingMallVariantAttributeValue.IRequest,
      },
    );
  typia.assert(searchAttribute1OnAttribute2);
  TestValidator.equals(
    "search with wrong attribute_id should return 0 results",
    searchAttribute1OnAttribute2.data.length,
    0,
  );
}