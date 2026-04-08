import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerProfile";
import type { IShoppingMallMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallMember";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductImage";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { generate_random_shopping_mall_seller_products_create } from "../../../generate/generate_random_shopping_mall_seller_products_create";
import { generate_random_shopping_mall_seller_products_variants_create } from "../../../generate/generate_random_shopping_mall_seller_products_variants_create";
import { prepare_random_shopping_mall_product } from "../../../prepare/prepare_random_shopping_mall_product";
import { prepare_random_shopping_mall_product_variant } from "../../../prepare/prepare_random_shopping_mall_product_variant";

/**
 * Test that an administrator receives 404 when the productId does not match the variant's actual parent product.
 *
 * Validates the business rule that a product variant must belong to the specified product when retrieving variant details. This test ensures that the system properly enforces the product-variant relationship and prevents accessing variants through incorrect product scope, which could lead to data integrity issues or unauthorized access patterns.
 *
 * The test creates two separate products with their own variants, then attempts to retrieve a variant using a mismatched product ID. The system should reject this request with a 404 Not Found error, confirming that the variant lookup validates both the variant existence and its parent product relationship.
 *
 * 1. Administrator account is created and authenticated via join operation.
 * 2. Seller account is created and authenticated to own the products.
 * 3. Seller creates Product A with Variant A attached to it.
 * 4. Seller creates Product B as a separate product.
 * 5. Administrator attempts to retrieve Variant A using Product B's productId.
 * 6. Validates that the system returns 404 Not Found due to productId/variantId mismatch.
 */
export async function test_api_product_variant_retrieve_mismatched_product_id_not_found(
  connection: api.IConnection,
): Promise<void> {
  // 1. Administrator setup - create and login
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      grade: "regular" as const,
    },
  });
  typia.assert(adminAuth);
  // 2. Seller setup - create and login
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(sellerAuth);
  // 3. Seller creates Product A
  const productA = await generate_random_shopping_mall_seller_products_create(
    sellerConnection,
    {},
  );
  typia.assert(productA);
  // 4. Seller creates Variant A on Product A
  const variantA =
    await generate_random_shopping_mall_seller_products_variants_create(
      sellerConnection,
      {
        params: { productId: productA.id },
      },
    );
  typia.assert(variantA);
  // 5. Seller creates Product B (second product for mismatch test)
  const productB = await generate_random_shopping_mall_seller_products_create(
    sellerConnection,
    {},
  );
  typia.assert(productB);
  // 6. Administrator attempts to retrieve Variant A using Product B's productId
  // This should return 404 because variantA belongs to productA, not productB
  await TestValidator.error(
    "variant not found with mismatched product ID",
    async () => {
      await api.functional.shoppingMall.admin.products.variants.at(
        adminConnection,
        {
          productId: productB.id,
          variantId: variantA.id,
        },
      );
    },
  );
}
