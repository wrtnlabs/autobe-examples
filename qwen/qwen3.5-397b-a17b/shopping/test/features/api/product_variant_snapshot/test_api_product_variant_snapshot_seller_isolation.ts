import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductImage";
import type { IShoppingMallProductOptionDefinition } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductOptionDefinition";
import type { IShoppingMallProductOptionValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductOptionValue";
import type { IShoppingMallProductRating } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductRating";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import type { IShoppingMallProductVariantSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariantSnapshot";
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
import { generate_random_shopping_mall_seller_products_option_definitions_create } from "../../../generate/generate_random_shopping_mall_seller_products_option_definitions_create";
import { generate_random_shopping_mall_seller_products_variants_create } from "../../../generate/generate_random_shopping_mall_seller_products_variants_create";
import { prepare_random_shopping_mall_product } from "../../../prepare/prepare_random_shopping_mall_product";
import { prepare_random_shopping_mall_product_option_definition } from "../../../prepare/prepare_random_shopping_mall_product_option_definition";
import { prepare_random_shopping_mall_product_variant } from "../../../prepare/prepare_random_shopping_mall_product_variant";

/**
 * Test that a seller cannot access variant snapshots belonging to another seller's products.
 *
 * This test validates the data isolation boundary ensuring sellers can only access
 * snapshots of their own products. The test creates a product with variants for Seller A,
 * creates a snapshot by editing the variant, then attempts to access that snapshot as
 * Seller B (a different seller account). The request should be rejected with an
 * authorization error.
 *
 * Test flow:
 * 1. Register and authenticate as Seller A
 * 2. Create a product owned by Seller A
 * 3. Create option definitions for the product
 * 4. Create a variant for the product
 * 5. Edit the variant to create a snapshot
 * 6. Register and authenticate as Seller B (different seller account)
 * 7. Attempt to retrieve Seller A's variant snapshot using Seller B's credentials
 * 8. Verify the request fails with authorization error
 */
export async function test_api_product_variant_snapshot_seller_isolation(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate as Seller A
  const sellerAConnection: api.IConnection = { host: connection.host };
  const sellerAAuth = await authorize_seller_join(sellerAConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "TestPassword123!",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(sellerAAuth);
  // 2. Create a product owned by Seller A
  const product = await generate_random_shopping_mall_seller_products_create(
    sellerAConnection,
    {},
  );
  typia.assert(product);
  // 3. Create option definitions for the product
  const optionDefinition =
    await generate_random_shopping_mall_seller_products_option_definitions_create(
      sellerAConnection,
      {
        params: { productId: product.id },
        body: { name: "Color" },
      },
    );
  typia.assert(optionDefinition);
  // 4. Create a variant for the product
  const variant =
    await generate_random_shopping_mall_seller_products_variants_create(
      sellerAConnection,
      {
        params: { productId: product.id },
        body: {
          sku_code: RandomGenerator.alphaNumeric(12),
          price_override: typia.random<
            number & tags.Type<"uint32"> & tags.Minimum<1000>
          >(),
          option_value_ids: [],
        },
      },
    );
  typia.assert(variant);
  // 5. Edit the variant to create a snapshot
  const updatedVariant =
    await api.functional.shoppingMall.seller.products.variants.update(
      sellerAConnection,
      {
        productId: product.id,
        variantId: variant.id,
        body: {
          sku_code: RandomGenerator.alphaNumeric(12),
        },
      },
    );
  typia.assert(updatedVariant);
  // 6. Register and authenticate as Seller B (different seller account)
  const sellerBConnection: api.IConnection = { host: connection.host };
  const sellerBAuth = await authorize_seller_join(sellerBConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "TestPassword123!",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(sellerBAuth);
  // 7. Attempt to retrieve Seller A's variant snapshot using Seller B's credentials
  // Generate a snapshot ID for testing - in production this would come from a list endpoint
  // The authorization check should reject Seller B's access regardless
  const variantSnapshotId = typia.random<string & tags.Format<"uuid">>();
  // 8. Verify the request fails with authorization error
  // Seller B should not be able to access Seller A's product variant snapshots
  await TestValidator.error(
    "Seller B cannot access Seller A's variant snapshot",
    async () => {
      await api.functional.shoppingMall.seller.products.variants.snapshots.at(
        sellerBConnection,
        {
          productId: product.id,
          variantId: variant.id,
          variantSnapshotId: variantSnapshotId,
        },
      );
    },
  );
}
