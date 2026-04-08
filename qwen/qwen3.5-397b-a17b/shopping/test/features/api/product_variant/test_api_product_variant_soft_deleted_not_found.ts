import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductImage";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { generate_random_shopping_mall_seller_products_create } from "../../../generate/generate_random_shopping_mall_seller_products_create";
import { generate_random_shopping_mall_seller_products_variants_create } from "../../../generate/generate_random_shopping_mall_seller_products_variants_create";
import { prepare_random_shopping_mall_product } from "../../../prepare/prepare_random_shopping_mall_product";
import { prepare_random_shopping_mall_product_variant } from "../../../prepare/prepare_random_shopping_mall_product_variant";

/**
 * Test that soft-deleted product variants are not accessible via the GET endpoint.
 *
 * Validates the soft-delete mechanism for product variants by ensuring that once a variant is deleted, it cannot be retrieved through the standard GET endpoint. This test confirms that the deleted_at timestamp properly excludes the variant from query results while preserving it in the database for historical order references.
 *
 * The test flow ensures seller authentication, product creation, variant creation, soft deletion, and verification that the deleted variant returns 404 Not Found on retrieval attempts. This validates the business rule that soft-deleted variants are hidden from sellers and customers while maintaining referential integrity with existing orders.
 *
 * 1. Seller registers and authenticates using authorize_seller_join utility.
 * 2. Seller creates a product using generate_random_shopping_mall_seller_products_create utility.
 * 3. Seller creates a variant for the product using generate_random_shopping_mall_seller_products_variants_create utility.
 * 4. Seller deletes the variant using the DELETE endpoint to set deleted_at timestamp.
 * 5. Seller attempts to retrieve the deleted variant using the GET endpoint.
 * 6. Test verifies the GET request returns 404 Not Found because the variant is soft-deleted.
 */
export async function test_api_product_variant_soft_deleted_not_found(
  connection: api.IConnection,
): Promise<void> {
  // 1. Seller registration and authentication
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IShoppingMallSeller.IJoin,
  });
  // 2. Create a product
  const product = await generate_random_shopping_mall_seller_products_create(
    sellerConnection,
    {},
  );
  typia.assert(product);
  // 3. Create a variant for the product
  const variant =
    await generate_random_shopping_mall_seller_products_variants_create(
      sellerConnection,
      {
        params: {
          productId: product.id,
        },
      },
    );
  typia.assert(variant);
  // 4. Delete the variant (soft delete - sets deleted_at)
  await api.functional.shoppingMall.seller.products.variants.erase(
    sellerConnection,
    {
      productId: product.id,
      variantId: variant.id,
    },
  );
  // 5 & 6. Attempt to retrieve the deleted variant and verify 404 Not Found
  await TestValidator.error(
    "soft-deleted variant should return 404",
    async () => {
      await api.functional.shoppingMall.seller.products.variants.at(
        sellerConnection,
        {
          productId: product.id,
          variantId: variant.id,
        },
      );
    },
  );
}
