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
import { prepare_random_shopping_mall_product_variant_attribute } from "../../../prepare/prepare_random_shopping_mall_product_variant_attribute";
import { generate_random_shopping_mall_admin_products_variants_attributes_update } from "../../../generate/generate_random_shopping_mall_admin_products_variants_attributes_update";
import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
export async function test_api_product_variant_attribute_update_by_admin(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create admin connection and join to establish identity
  const adminConnection: api.IConnection = { host: connection.host };
  const admin: IShoppingMallAdmin.IAuthorized = await authorize_admin_join(
    adminConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        href: "https://example.com/admin/join",
        referrer: "https://example.com/admin/signup",
      } satisfies IShoppingMallAdmin.IJoin,
    },
  );
  typia.assert(admin);
  // Step 2: Generate a product ID for testing
  const productId: string = typia.random<string & tags.Format<"uuid">>();
  // Step 3: Generate an attribute ID to use
  const attributeId: string = typia.random<string & tags.Format<"uuid">>();
  // Step 4: Establish the initial relationship using the update endpoint
  // The update endpoint can create a relationship if it doesn't exist
  const initialUpdate: IShoppingMallProductVariantAttribute =
    await api.functional.shoppingMall.admin.products.variants.attributes.update(
      adminConnection,
      {
        productId: productId,
        attributeId: attributeId,
        body: {
          name: RandomGenerator.name(),
          description: RandomGenerator.paragraph(),
          type: typia.random<"string" | "number" | "boolean" | "enum">(),
        } satisfies IShoppingMallProductVariantAttribute.ICreate,
      },
    );
  typia.assert(initialUpdate);
  // Step 5: Update the product variant attribute with new values
  const updatedAttribute: IShoppingMallProductVariantAttribute =
    await api.functional.shoppingMall.admin.products.variants.attributes.update(
      adminConnection,
      {
        productId: productId,
        attributeId: attributeId,
        body: {
          name: RandomGenerator.name(),
          description: RandomGenerator.paragraph(),
          type: typia.random<"string" | "number" | "boolean" | "enum">(),
        } satisfies IShoppingMallProductVariantAttribute.ICreate,
      },
    );
  typia.assert(updatedAttribute);
  // Step 6: Validate that the update changed the attribute values
  TestValidator.notEquals(
    "attribute name was updated",
    updatedAttribute.name,
    initialUpdate.name,
  );
  TestValidator.notEquals(
    "attribute description was updated",
    updatedAttribute.description,
    initialUpdate.description,
  );
  TestValidator.notEquals(
    "attribute type was updated",
    updatedAttribute.attributeType,
    initialUpdate.attributeType,
  );
}
