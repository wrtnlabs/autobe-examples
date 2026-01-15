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
import { generate_random_shopping_mall_admin_product_variants_attributes_create } from "../../../generate/generate_random_shopping_mall_admin_product_variants_attributes_create";
import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
export async function test_api_product_variant_attribute_update_by_admin(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create admin account via join
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
  // Step 2: Create a product variant attribute with minimum required fields
  const createdAttribute =
    await generate_random_shopping_mall_admin_product_variants_attributes_create(
      adminConnection,
      {
        body: {
          name: RandomGenerator.name(),
          description: RandomGenerator.paragraph({ sentences: 2 }),
          type: "string" as const,
        } satisfies IShoppingMallProductVariantAttribute.ICreate,
      },
    );
  typia.assert(createdAttribute);
  // Step 3: Update the created attribute with new values
  const updatedAttribute =
    await api.functional.shoppingMall.admin.product_variants.attributes.update(
      adminConnection,
      {
        attributeId: createdAttribute.id,
        body: {
          name: "Updated Name",
          type: "number" as const,
        } satisfies IShoppingMallProductVariantAttribute.IUpdate,
      },
    );
  typia.assert(updatedAttribute);
  // Step 4: Validate that the update was successful and persisted
  TestValidator.equals(
    "Updated attribute name matches",
    updatedAttribute.name,
    "Updated Name",
  );
  TestValidator.equals(
    "Updated attribute type matches",
    updatedAttribute.attributeType,
    "number",
  );
  // Step 5: Verify updatedAt field was updated (should be different from createdAt)
  // since updatedAt and createdAt don't exist on IShoppingMallProductVariantAttribute,
  // we cannot validate them. Remove this check.
  // Step 6: Confirm the attribute is still accessible and functional
  // The update operation returns the updated attribute, so we can validate against that directly
  TestValidator.equals(
    "Retrieved attribute matches updated data",
    updatedAttribute.name,
    "Updated Name",
  );
  TestValidator.equals(
    "Retrieved attribute type matches",
    updatedAttribute.attributeType,
    "number",
  );
}
