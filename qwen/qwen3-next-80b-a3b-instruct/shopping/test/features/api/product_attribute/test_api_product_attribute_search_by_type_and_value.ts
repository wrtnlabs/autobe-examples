import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallProductAttribute } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallProductAttribute";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallProductAttribute } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductAttribute";
import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
/**
 * Test complex attribute search filtering by type and exact value. Validates
 * system returns only attributes of specified type (e.g., 'select') with exact
 * value match (e.g., 'Red'), respecting both type and value filters
 * simultaneously. Confirms that boolean type returns true/false values
 * correctly, number type returns numeric values, and text type is not affected
 * by exact value matching. Verifies correct pagination and that inactive
 * attributes are excluded from results.
 *
 * This test assumes pre-existing attributes in the system with various types as
 * it's impossible to create attributes with the available API endpoint.
 *
 * 1. Admin authenticates
 * 2. Retrieves product ID (generated randomly)
 * 3. Searches attributes by type and value with various filters
 * 4. Validates search results match expected behavior
 */
export async function test_api_product_attribute_search_by_type_and_value(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Authenticate as admin
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: `https://example.com/admin/join-${RandomGenerator.alphaNumeric(6)}`,
      referrer: `https://example.com/admin/signup-${RandomGenerator.alphaNumeric(6)}`,
    } satisfies IShoppingMallAdmin.IJoin,
  });
  typia.assert(admin);
  // Step 2: Generate a productId to search against (assumed to have attributes)
  const productId = typia.random<string & tags.Format<"uuid">>();
  // Step 3: Test search with type and value filters
  // Search for 'select' type with exact value 'Red' (should match color attribute)
  const selectResult =
    await api.functional.shoppingMall.admin.products.attributes.index(
      adminConnection,
      {
        productId: productId,
        body: {
          type: "select",
          value: "Red",
          status: "active",
          page: 1,
          limit: 10,
        } satisfies IShoppingMallProductAttribute.IRequest,
      },
    );
  typia.assert(selectResult);
  TestValidator.equals(
    "select type with value Red should return 1 result",
    selectResult.pagination.records,
    1,
  );
  TestValidator.equals(
    "select type with value Red should return 1 page",
    selectResult.pagination.pages,
    1,
  );
  TestValidator.equals(
    "select type with value Red should return attribute with name Color",
    selectResult.data[0].name,
    "Color",
  );
  // Search for boolean type with true value (should match Waterproof attribute)
  const booleanResult =
    await api.functional.shoppingMall.admin.products.attributes.index(
      adminConnection,
      {
        productId: productId,
        body: {
          type: "boolean",
          value: "true",
          status: "active",
          page: 1,
          limit: 10,
        } satisfies IShoppingMallProductAttribute.IRequest,
      },
    );
  typia.assert(booleanResult);
  TestValidator.equals(
    "boolean type with value true should return 1 result",
    booleanResult.pagination.records,
    1,
  );
  TestValidator.equals(
    "boolean type with value true should return attribute with name Waterproof",
    booleanResult.data[0].name,
    "Waterproof",
  );
  // Search for boolean type with false value (should return 0 results)
  const booleanFalseResult =
    await api.functional.shoppingMall.admin.products.attributes.index(
      adminConnection,
      {
        productId: productId,
        body: {
          type: "boolean",
          value: "false",
          status: "active",
          page: 1,
          limit: 10,
        } satisfies IShoppingMallProductAttribute.IRequest,
      },
    );
  typia.assert(booleanFalseResult);
  TestValidator.equals(
    "boolean type with value false should return 0 results",
    booleanFalseResult.pagination.records,
    0,
  );
  // Search for number type with value "100" (should match Capacity attribute)
  const numberResult =
    await api.functional.shoppingMall.admin.products.attributes.index(
      adminConnection,
      {
        productId: productId,
        body: {
          type: "number",
          value: "100",
          status: "active",
          page: 1,
          limit: 10,
        } satisfies IShoppingMallProductAttribute.IRequest,
      },
    );
  typia.assert(numberResult);
  TestValidator.equals(
    "number type with value 100 should return 1 result",
    numberResult.pagination.records,
    1,
  );
  TestValidator.equals(
    "number type with value 100 should return attribute with name Capacity",
    numberResult.data[0].name,
    "Capacity",
  );
  // Search for text type with value "Sample" (should return Description attribute)
  const textResult =
    await api.functional.shoppingMall.admin.products.attributes.index(
      adminConnection,
      {
        productId: productId,
        body: {
          type: "text",
          value: "Sample",
          status: "active",
          page: 1,
          limit: 10,
        } satisfies IShoppingMallProductAttribute.IRequest,
      },
    );
  typia.assert(textResult);
  TestValidator.equals(
    "text type with value Sample should return 1 result",
    textResult.pagination.records,
    1,
  );
  TestValidator.equals(
    "text type with value Sample should return attribute with name Description",
    textResult.data[0].name,
    "Description",
  );
  // Search for text type with partial match "Desc" (should return 1 result)
  const textPartialResult =
    await api.functional.shoppingMall.admin.products.attributes.index(
      adminConnection,
      {
        productId: productId,
        body: {
          type: "text",
          value: "Desc",
          status: "active",
          page: 1,
          limit: 10,
        } satisfies IShoppingMallProductAttribute.IRequest,
      },
    );
  typia.assert(textPartialResult);
  TestValidator.equals(
    "text type with partial value Desc should return 1 result",
    textPartialResult.pagination.records,
    1,
  );
  TestValidator.equals(
    "text type with partial value Desc should return attribute with name Description",
    textPartialResult.data[0].name,
    "Description",
  );
  // Search for non-existent value (should return 0 results)
  const nonExistentResult =
    await api.functional.shoppingMall.admin.products.attributes.index(
      adminConnection,
      {
        productId: productId,
        body: {
          type: "select",
          value: "NonExistentColor",
          status: "active",
          page: 1,
          limit: 10,
        } satisfies IShoppingMallProductAttribute.IRequest,
      },
    );
  typia.assert(nonExistentResult);
  TestValidator.equals(
    "non-existent value search should return 0 results",
    nonExistentResult.pagination.records,
    0,
  );
  // Search for inactive attributes (should return 1 record as we're filtering by inactive)
  const inactiveResult =
    await api.functional.shoppingMall.admin.products.attributes.index(
      adminConnection,
      {
        productId: productId,
        body: {
          type: "select",
          value: "Discount",
          status: "inactive",
          page: 1,
          limit: 10,
        } satisfies IShoppingMallProductAttribute.IRequest,
      },
    );
  typia.assert(inactiveResult);
  TestValidator.equals(
    "search for inactive status should return 1 record",
    inactiveResult.pagination.records,
    1,
  );
  TestValidator.equals(
    "inactive attribute should be returned when filtering by inactive status",
    inactiveResult.data[0].name,
    "Discount",
  );
  // Search for active attributes should exclude inactive
  const activeResult =
    await api.functional.shoppingMall.admin.products.attributes.index(
      adminConnection,
      {
        productId: productId,
        body: {
          type: "select",
          value: "", // empty value to match all selects, active status
          status: "active",
          page: 1,
          limit: 10,
        } satisfies IShoppingMallProductAttribute.IRequest,
      },
    );
  typia.assert(activeResult);
  TestValidator.equals(
    "active status search should return only active select attribute",
    activeResult.pagination.records,
    1,
  );
  TestValidator.notEquals(
    "active search should not return discount (inactive) attribute",
    activeResult.data[0].name,
    "Discount",
  );
  // Test pagination (1 active select attribute: Color)
  const pageResult =
    await api.functional.shoppingMall.admin.products.attributes.index(
      adminConnection,
      {
        productId: productId,
        body: {
          type: "select",
          value: "", // all select attributes
          status: "active", // only active
          page: 1,
          limit: 1,
        } satisfies IShoppingMallProductAttribute.IRequest,
      },
    );
  typia.assert(pageResult);
  TestValidator.equals(
    "pagination limit 1 should return 1 record",
    pageResult.pagination.limit,
    1,
  );
  TestValidator.equals(
    "pagination records should be 1 for active select attribute",
    pageResult.pagination.records,
    1,
  );
  TestValidator.equals(
    "pagination pages should be 1 for 1 record with limit 1",
    pageResult.pagination.pages,
    1,
  );
  TestValidator.equals(
    "first page should return Color attribute",
    pageResult.data[0].name,
    "Color",
  );
  // Skip second page test as we only have 1 active attribute - no second page
  // Test type filter only (only type specified)
  const typeOnlyResult =
    await api.functional.shoppingMall.admin.products.attributes.index(
      adminConnection,
      {
        productId: productId,
        body: {
          type: "select",
          status: "active",
          page: 1,
          limit: 10,
        } satisfies IShoppingMallProductAttribute.IRequest,
      },
    );
  typia.assert(typeOnlyResult);
  TestValidator.equals(
    "type filter only should return 1 active select attribute",
    typeOnlyResult.pagination.records,
    1,
  );
  TestValidator.equals(
    "type filter only should return Color attribute",
    typeOnlyResult.data[0].name,
    "Color",
  );
  // Test value filter only (only value specified)
  const valueOnlyResult =
    await api.functional.shoppingMall.admin.products.attributes.index(
      adminConnection,
      {
        productId: productId,
        body: {
          value: "Color",
          status: "active",
          page: 1,
          limit: 10,
        } satisfies IShoppingMallProductAttribute.IRequest,
      },
    );
  typia.assert(valueOnlyResult);
  TestValidator.equals(
    "value filter only should return 1 result",
    valueOnlyResult.pagination.records,
    1,
  );
  TestValidator.equals(
    "value filter only should return Color attribute",
    valueOnlyResult.data[0].name,
    "Color",
  );
}
