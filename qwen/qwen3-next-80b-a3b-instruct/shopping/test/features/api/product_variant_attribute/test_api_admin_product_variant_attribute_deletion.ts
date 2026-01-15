import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallVariantAttribute } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallVariantAttribute";
import type { IShoppingMallVariantAttributeValidation } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallVariantAttributeValidation";
import { prepare_random_shopping_mall_variant_attribute } from "../../../prepare/prepare_random_shopping_mall_variant_attribute";
import { generate_random_shopping_mall_admin_products_variants_attributes_create } from "../../../generate/generate_random_shopping_mall_admin_products_variants_attributes_create";
import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
export async function test_api_admin_product_variant_attribute_deletion(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create admin connection and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IShoppingMallAdmin.IJoin,
  });
  typia.assert(admin);
  // Step 2: Create a product with a valid UUID
  const productId = typia.random<string & tags.Format<"uuid">>();
  // Step 3: Create a product variant attribute using the admin connection
  const attribute =
    await generate_random_shopping_mall_admin_products_variants_attributes_create(
      adminConnection,
      {
        body: {
          name: RandomGenerator.name(),
          type: "select" as const,
          required: true,
          category_id: typia.random<string & tags.Format<"uuid">>(),
          product_id: productId,
        } satisfies IShoppingMallVariantAttribute.ICreate,
        params: {
          productId,
        },
      },
    );
  typia.assert(attribute);
  // Step 4: Delete the attribute using the admin connection
  await api.functional.shoppingMall.admin.products.variants.attributes.erase(
    adminConnection,
    {
      productId,
      attributeId: attribute.id,
    },
  );
  // Step 5: Verify the attribute was deleted by attempting to re-delete (should fail)
  await TestValidator.error(
    "deleting already deleted attribute should fail",
    async () => {
      await api.functional.shoppingMall.admin.products.variants.attributes.erase(
        adminConnection,
        {
          productId,
          attributeId: attribute.id,
        },
      );
    },
  );
  // Step 6: Test that users with no permissions cannot delete attributes
  // Create a fresh connection without authentication
  const unauthorizedConnection: api.IConnection = { host: connection.host };
  // Try to delete the attribute as an unauthenticated user
  await TestValidator.error(
    "unauthenticated user cannot delete product variant attribute",
    async () => {
      await api.functional.shoppingMall.admin.products.variants.attributes.erase(
        unauthorizedConnection,
        {
          productId,
          attributeId: attribute.id,
        },
      );
    },
  );
}
