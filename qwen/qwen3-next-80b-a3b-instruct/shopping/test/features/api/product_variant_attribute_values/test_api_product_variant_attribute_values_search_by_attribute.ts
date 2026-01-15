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
export async function test_api_product_variant_attribute_values_search_by_attribute(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create admin connection and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: "https://example.com/admin/join",
      referrer: "https://example.com/admin/signup",
    } satisfies IShoppingMallAdmin.IJoin,
  });
  typia.assert(admin);
  // Step 2: Create a product attribute
  const attribute =
    await generate_random_shopping_mall_admin_product_variants_attributes_create(
      adminConnection,
      {
        body: {
          name: RandomGenerator.name(),
          description: RandomGenerator.paragraph(),
          type: "enum",
        } satisfies IShoppingMallProductVariantAttribute.ICreate,
      },
    );
  typia.assert(attribute);
  // Step 3: Create multiple attribute values for this attribute (active)
  const activeValues = await ArrayUtil.asyncRepeat(5, async (i) => {
    return await generate_random_shopping_mall_admin_product_variants_attribute_values_create(
      adminConnection,
      {
        body: {
          attribute_type_id: attribute.id,
          name: `Value ${i + 1}`,
          display_order: i + 1,
        } satisfies IShoppingMallVariantAttributeValue.ICreate,
      },
    );
  });
  activeValues.forEach((value) => typia.assert(value));
  // Step 4: Create additional attribute values with different attribute type (active)
  const differentAttribute =
    await generate_random_shopping_mall_admin_product_variants_attributes_create(
      adminConnection,
      {
        body: {
          name: RandomGenerator.name(),
          description: RandomGenerator.paragraph(),
          type: "string",
        } satisfies IShoppingMallProductVariantAttribute.ICreate,
      },
    );
  typia.assert(differentAttribute);
  const differentValues = await ArrayUtil.asyncRepeat(3, async (i) => {
    return await generate_random_shopping_mall_admin_product_variants_attribute_values_create(
      adminConnection,
      {
        body: {
          attribute_type_id: differentAttribute.id,
          name: `Different ${i + 1}`,
          display_order: i + 1,
        } satisfies IShoppingMallVariantAttributeValue.ICreate,
      },
    );
  });
  differentValues.forEach((value) => typia.assert(value));
  // Step 5: Create inactive attribute values for the same attribute
  const inactiveValues = await ArrayUtil.asyncRepeat(3, async (i) => {
    return await generate_random_shopping_mall_admin_product_variants_attribute_values_create(
      adminConnection,
      {
        body: {
          attribute_type_id: attribute.id,
          name: `Inactive ${i + 1}`,
          display_order: i + 100,
        } satisfies IShoppingMallVariantAttributeValue.ICreate,
      },
    );
  });
  inactiveValues.forEach((value) => typia.assert(value));
  // Step 6: Perform the search with specific attribute ID, page=1, limit=10
  const searchResult =
    await api.functional.shoppingMall.product_variants.attribute_values.index(
      adminConnection,
      {
        body: {
          attr_id: attribute.id,
          page: 1,
          limit: 10,
          status: "active",
        } satisfies IShoppingMallVariantAttributeValue.IRequest,
      },
    );
  typia.assert(searchResult);
  // Step 7: Validate results
  TestValidator.equals("page number is 1", searchResult.pagination.current, 1);
  TestValidator.equals("limit is 10", searchResult.pagination.limit, 10);
  TestValidator.equals(
    "should return 5 active values",
    searchResult.pagination.records,
    5,
  );
  TestValidator.equals("should have 1 page", searchResult.pagination.pages, 1);
  TestValidator.equals("should return 5 values", searchResult.data.length, 5);
  // Validate that all returned values belong to the specified attribute
  searchResult.data.forEach((value) => {
    TestValidator.equals(
      "attribute_id matches",
      value.attribute_id,
      attribute.id,
    );
  });
  // Validate that all returned values are active
  searchResult.data.forEach((value) => {
    TestValidator.equals("is_active is true", value.is_active, true);
  });
  // Validate sorting by display_order (ascending)
  for (let i = 0; i < searchResult.data.length - 1; i++) {
    TestValidator.predicate(
      `display_order ${i} <= ${i + 1}`,
      searchResult.data[i].display_order <=
        searchResult.data[i + 1].display_order,
    );
  }
  // Validate that no values from different attribute are returned
  searchResult.data.forEach((value) => {
    TestValidator.notEquals(
      "value does not belong to different attribute",
      value.attribute_id,
      differentAttribute.id,
    );
  });
  // Validate that no inactive values are returned
  TestValidator.predicate(
    "no inactive values in results",
    searchResult.data.every((value) => value.is_active === true),
  );
}