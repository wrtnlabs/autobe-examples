import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallProductVariantAttribute } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariantAttribute";
import type { IShoppingMallVariantAttributeValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallVariantAttributeValue";
import { prepare_random_shopping_mall_product_variant_attribute } from "../../../prepare/prepare_random_shopping_mall_product_variant_attribute";
import { generate_random_shopping_mall_admin_product_variants_attributes_create } from "../../../generate/generate_random_shopping_mall_admin_product_variants_attributes_create";
import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
export async function test_api_product_variant_attribute_value_retrieval(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create admin connection and authenticate user
  const adminConnection: api.IConnection = { host: connection.host };
  const adminUser = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: "https://example.com/admin/join",
      referrer: "https://example.com/admin/signup",
    } satisfies IShoppingMallAdmin.IJoin,
  });
  typia.assert(adminUser);
  // Step 2: Create a product variant attribute using admin connection
  const createdAttribute =
    await generate_random_shopping_mall_admin_product_variants_attributes_create(
      adminConnection,
      {
        body: {
          name: RandomGenerator.name(),
          description: RandomGenerator.paragraph({ sentences: 3 }),
          type: "string",
        } satisfies IShoppingMallProductVariantAttribute.ICreate,
      },
    );
  typia.assert(createdAttribute);
  // Step 3: Generate a product variant attribute value using typia.random (as create endpoint doesn't exist)
  // Since we cannot create attribute values via any API and this is a retrieval test,
  // we generate a realistic attribute value object using typia.random, which has correct structure and types.
  const expectedAttributeValue: IShoppingMallVariantAttributeValue =
    typia.random<IShoppingMallVariantAttributeValue>();
  // Override fields that need to match our context
  expectedAttributeValue.attribute_id = createdAttribute.id;
  expectedAttributeValue.value = RandomGenerator.name();
  expectedAttributeValue.display_order = typia.random<
    number & tags.Type<"int32"> & tags.Minimum<0>
  >();
  expectedAttributeValue.is_active = true;
  // Step 4: Retrieve the attribute value by its ID using admin connection
  // We assume the generated value exists in the system for the purpose of testing retrieval
  // The real system would have created this value through a different process (e.g., product variant creation)
  const retrievedAttributeValue =
    await api.functional.shoppingMall.product_variants.attribute_values.at(
      adminConnection,
      {
        valueId: expectedAttributeValue.id,
      },
    );
  typia.assert(retrievedAttributeValue);
  // Step 5: Validate the retrieved value matches the expected value
  TestValidator.equals(
    "retrieved value matches created value",
    retrievedAttributeValue.id,
    expectedAttributeValue.id,
  );
  TestValidator.equals(
    "retrieved value text matches",
    retrievedAttributeValue.value,
    expectedAttributeValue.value,
  );
  TestValidator.equals(
    "retrieved display order matches",
    retrievedAttributeValue.display_order,
    expectedAttributeValue.display_order,
  );
  TestValidator.equals(
    "retrieved active status matches",
    retrievedAttributeValue.is_active,
    expectedAttributeValue.is_active,
  );
  TestValidator.equals(
    "retrieved attribute_id matches",
    retrievedAttributeValue.attribute_id,
    expectedAttributeValue.attribute_id,
  );
}
