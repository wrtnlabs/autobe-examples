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
import { prepare_random_shopping_mall_variant_attribute_value } from "../../../prepare/prepare_random_shopping_mall_variant_attribute_value";
import { generate_random_shopping_mall_admin_product_variants_attributes_create } from "../../../generate/generate_random_shopping_mall_admin_product_variants_attributes_create";
import { generate_random_shopping_mall_admin_product_variants_attribute_values_create } from "../../../generate/generate_random_shopping_mall_admin_product_variants_attribute_values_create";
import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
export async function test_api_product_variant_attribute_value_deletion_by_admin(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create a new connection and authenticate as admin
  const adminConnection: api.IConnection = { host: connection.host };
  const authorizedAdmin: IShoppingMallAdmin.IAuthorized =
    await authorize_admin_join(adminConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        href: `https://example.com/admin/join-${RandomGenerator.alphaNumeric(6)}`,
        referrer: `https://example.com/admin/signup-${RandomGenerator.alphaNumeric(6)}`,
      },
    });
  typia.assert(authorizedAdmin);
  // Step 2: Create a new product variant attribute
  const attribute: IShoppingMallProductVariantAttribute =
    await generate_random_shopping_mall_admin_product_variants_attributes_create(
      adminConnection,
      {
        body: {
          name: RandomGenerator.name(1),
          description: RandomGenerator.paragraph({ sentences: 3 }),
          type: "string",
        },
      },
    );
  typia.assert(attribute);
  // Step 3: Create a specific attribute value using the attribute created above
  const attributeValue1: IShoppingMallVariantAttributeValue =
    await generate_random_shopping_mall_admin_product_variants_attribute_values_create(
      adminConnection,
      {
        body: {
          attribute_type_id: attribute.id,
          name: RandomGenerator.name(1),
          display_order: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<0>
          >(),
        },
      },
    );
  typia.assert(attributeValue1);
  // Step 4: Delete the attribute value using its ID
  await api.functional.shoppingMall.admin.product_variants.attribute_values.erase(
    adminConnection,
    {
      valueId: attributeValue1.id,
    },
  );
  // Step 5: Attempt to create another attribute value with the same attribute_type_id and name
  // If creation succeeds, it proves the deleted value is no longer present
  // This validates the deletion was successful
  const attributeValue2: IShoppingMallVariantAttributeValue =
    await generate_random_shopping_mall_admin_product_variants_attribute_values_create(
      adminConnection,
      {
        body: {
          attribute_type_id: attribute.id,
          name: attributeValue1.value, // Use the same value as deleted value (property name is 'value', not 'name')
          display_order: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<0>
          >(),
        },
      },
    );
  typia.assert(attributeValue2);
  // Step 6: Validate that the new value was created successfully
  // If we can create a value with the same value after deletion, the deletion was successful
  TestValidator.equals(
    "new attribute value created successfully after deletion",
    attributeValue2.value, // Use 'value' property instead of 'name'
    attributeValue1.value,
  );
  TestValidator.equals(
    "new attribute value has correct attribute type",
    attributeValue2.attribute_id, // Use 'attribute_id' property instead of 'attribute_type_id'
    attribute.id,
  );
}
