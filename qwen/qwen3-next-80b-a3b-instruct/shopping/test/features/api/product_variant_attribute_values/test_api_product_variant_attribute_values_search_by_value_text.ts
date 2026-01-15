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
export async function test_api_product_variant_attribute_values_search_by_value_text(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Authenticate admin user by joining
  const adminConnection: api.IConnection = { host: connection.host };
  const adminResult = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: "https://example.com/join",
      referrer: "https://example.com/referrer",
    } satisfies IShoppingMallAdmin.IJoin,
  });
  typia.assert(adminResult);
  // Step 2: Create an attribute type
  const attribute =
    await generate_random_shopping_mall_admin_product_variants_attributes_create(
      adminConnection,
      {
        body: {
          name: "Color",
          description: "Product color variant",
          type: "string",
        } satisfies IShoppingMallProductVariantAttribute.ICreate,
      },
    );
  typia.assert(attribute);
  // Step 3: Create multiple attribute values with various text patterns
  const values = await ArrayUtil.asyncRepeat(12, async (index) => {
    const valueText = [
      "Red",
      "blue",
      "Green",
      "large",
      "XL",
      "Super Size",
      "Cotton",
      "❤️ Red Heart",
      "🔥 Hot🔥",
      "#FF0000",
      "A123B456",
      "test@domain.com",
    ][index % 12];
    return await generate_random_shopping_mall_admin_product_variants_attribute_values_create(
      adminConnection,
      {
        body: {
          attribute_type_id: attribute.id,
          name: valueText,
          display_order: index + 1,
        } satisfies IShoppingMallVariantAttributeValue.ICreate,
      },
    );
  });
  // Step 4: Test search with case-insensitive partial matching
  const searchPattern = "red";
  const searchResult =
    await api.functional.shoppingMall.product_variants.attribute_values.index(
      adminConnection,
      {
        body: {
          value: searchPattern,
        } satisfies IShoppingMallVariantAttributeValue.IRequest,
      },
    );
  typia.assert(searchResult);
  // Validate that results contain all values with 'red' (case-insensitive)
  const foundValues = searchResult.data;
  TestValidator.equals(
    "pagination: expected page 1",
    searchResult.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination: expected limit 10",
    searchResult.pagination.limit,
    10,
  );
  TestValidator.equals(
    "pagination: expected total records 4",
    searchResult.pagination.records,
    4,
  );
  TestValidator.equals(
    "pagination: expected pages 1",
    searchResult.pagination.pages,
    1,
  );
  TestValidator.predicate(
    "search results should not be empty",
    foundValues.length > 0,
  );
  TestValidator.predicate(
    "search results should have case-insensitive match",
    foundValues.some((v) =>
      v.value.toLowerCase().includes(searchPattern.toLowerCase()),
    ),
  );
  TestValidator.predicate(
    "all results should contain search term",
    foundValues.every((v) =>
      v.value.toLowerCase().includes(searchPattern.toLowerCase()),
    ),
  );
  // Verify exactly the expected values are returned
  const expectedValues = ["Red", "❤️ Red Heart", "#FF0000", "test@domain.com"];
  const foundValuesSet = new Set(foundValues.map((v) => v.value));
  expectedValues.forEach((expected) => {
    TestValidator.predicate(
      `value '${expected}' should be included`,
      foundValuesSet.has(expected),
    );
  });
  TestValidator.equals(
    "exactly 4 correct results found",
    foundValues.length,
    4,
  );
  // Step 5: Test pagination with more results
  const searchPattern2 = "test";
  const searchResult2 =
    await api.functional.shoppingMall.product_variants.attribute_values.index(
      adminConnection,
      {
        body: {
          value: searchPattern2,
          limit: 5,
        } satisfies IShoppingMallVariantAttributeValue.IRequest,
      },
    );
  typia.assert(searchResult2);
  TestValidator.equals(
    "pagination: expected page 1",
    searchResult2.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination: expected limit 5",
    searchResult2.pagination.limit,
    5,
  );
  TestValidator.equals(
    "pagination: expected total records 1",
    searchResult2.pagination.records,
    1,
  );
  TestValidator.equals(
    "pagination: expected pages 1",
    searchResult2.pagination.pages,
    1,
  );
  TestValidator.equals(
    "search results: should find exact match",
    searchResult2.data.length,
    1,
  );
  TestValidator.equals(
    "search result value",
    searchResult2.data[0].value,
    "test@domain.com",
  );
  // Step 6: Test search with special characters (emoji)
  const emojiPattern = "❤️";
  const searchResult3 =
    await api.functional.shoppingMall.product_variants.attribute_values.index(
      adminConnection,
      {
        body: {
          value: emojiPattern,
        } satisfies IShoppingMallVariantAttributeValue.IRequest,
      },
    );
  typia.assert(searchResult3);
  TestValidator.equals(
    "search results: should find emoji match",
    searchResult3.data.length,
    1,
  );
  TestValidator.equals(
    "search result value",
    searchResult3.data[0].value,
    "❤️ Red Heart",
  );
  // Step 7: Test search with special characters (hash)
  const hashPattern = "#";
  const searchResult4 =
    await api.functional.shoppingMall.product_variants.attribute_values.index(
      adminConnection,
      {
        body: {
          value: hashPattern,
        } satisfies IShoppingMallVariantAttributeValue.IRequest,
      },
    );
  typia.assert(searchResult4);
  TestValidator.equals(
    "search results: should find hash match",
    searchResult4.data.length,
    1,
  );
  TestValidator.equals(
    "search result value",
    searchResult4.data[0].value,
    "#FF0000",
  );
  // Step 8: Test search with alphanumeric pattern
  const alphanumericPattern = "A123";
  const searchResult5 =
    await api.functional.shoppingMall.product_variants.attribute_values.index(
      adminConnection,
      {
        body: {
          value: alphanumericPattern,
        } satisfies IShoppingMallVariantAttributeValue.IRequest,
      },
    );
  typia.assert(searchResult5);
  TestValidator.equals(
    "search results: should find alphanumeric match",
    searchResult5.data.length,
    1,
  );
  TestValidator.equals(
    "search result value",
    searchResult5.data[0].value,
    "A123B456",
  );
  // Step 9: Test search precision - verify no false positives from similar terms
  const similarPattern = "la"; // Should match "large" and "small" but we don't have "small"
  const searchResult6 =
    await api.functional.shoppingMall.product_variants.attribute_values.index(
      adminConnection,
      {
        body: {
          value: similarPattern,
        } satisfies IShoppingMallVariantAttributeValue.IRequest,
      },
    );
  typia.assert(searchResult6);
  TestValidator.equals(
    "search results: should find correct match",
    searchResult6.data.length,
    1,
  );
  TestValidator.equals(
    "search result value",
    searchResult6.data[0].value,
    "large",
  );
  // Step 10: Test search with empty result
  const nonExistingPattern = "nonexistentterm";
  const searchResult7 =
    await api.functional.shoppingMall.product_variants.attribute_values.index(
      adminConnection,
      {
        body: {
          value: nonExistingPattern,
        } satisfies IShoppingMallVariantAttributeValue.IRequest,
      },
    );
  typia.assert(searchResult7);
  TestValidator.equals(
    "search results: should have no results",
    searchResult7.data.length,
    0,
  );
  TestValidator.equals(
    "pagination: expected page 1",
    searchResult7.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination: expected limit 10",
    searchResult7.pagination.limit,
    10,
  );
  TestValidator.equals(
    "pagination: expected total records 0",
    searchResult7.pagination.records,
    0,
  );
  TestValidator.equals(
    "pagination: expected pages 0",
    searchResult7.pagination.pages,
    0,
  );
}
