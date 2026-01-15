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
export async function test_api_variant_attribute_creation_by_admin(
  connection: api.IConnection,
): Promise<void> {
  // Create admin connection and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  const admin: IShoppingMallAdmin.IAuthorized = await authorize_admin_join(
    adminConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IShoppingMallAdmin.IJoin,
    },
  );
  typia.assert(admin);
  // Generate a valid UUID for productId and category_id since we cannot create a product
  const productId = typia.random<string & tags.Format<"uuid">>();
  const categoryId = typia.random<string & tags.Format<"uuid">>();
  // Create variant attribute using utility function
  const attribute =
    await generate_random_shopping_mall_admin_products_variants_attributes_create(
      adminConnection,
      {
        body: {
          name: "Size",
          description: "Product size categories: S, M, L, XL",
          type: "select",
          required: true,
          category_id: categoryId,
          product_id: productId,
        } satisfies IShoppingMallVariantAttribute.ICreate,
        params: {
          productId,
        },
      },
    );
  typia.assert(attribute);
  // Verify attribute properties are preserved exactly as submitted
  TestValidator.equals("attribute name matches", attribute.name, "Size");
  TestValidator.equals(
    "attribute description matches",
    attribute.description,
    "Product size categories: S, M, L, XL",
  );
  TestValidator.equals("attribute type matches", attribute.type, "select");
  TestValidator.equals(
    "attribute required flag matches",
    attribute.is_required,
    true,
  );
}
