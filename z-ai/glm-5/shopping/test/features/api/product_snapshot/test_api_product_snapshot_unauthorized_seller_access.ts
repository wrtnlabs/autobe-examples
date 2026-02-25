import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductImage";
import type { IShoppingMallProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductSnapshot";
import type { IShoppingMallProductSnapshotImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductSnapshotImage";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import type { IShoppingMallProductVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariantOption";
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
import { prepare_random_shopping_mall_product } from "../../../prepare/prepare_random_shopping_mall_product";

/**
 * Test authorization enforcement where a seller attempts to view another seller's product snapshot.
 *
 * This test validates that sellers can only access snapshots of their own products.
 * Steps:
 * 1. Register and authenticate as Seller A
 * 2. As Seller A, create a product
 * 3. As Seller A, update the product to create a snapshot
 * 4. Register and authenticate as Seller B (a different seller)
 * 5. As Seller B, attempt to retrieve Seller A's product snapshot
 *
 * Expected: HTTP 403 Forbidden - sellers cannot view other sellers' product snapshots
 */
export async function test_api_product_snapshot_unauthorized_seller_access(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Register and authenticate Seller A
  const sellerAConnection: api.IConnection = { host: connection.host };
  const sellerA = await authorize_seller_join(sellerAConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      shop_name: `SellerA_Shop_${RandomGenerator.alphabets(6)}`,
    },
  });
  typia.assert(sellerA);
  // Step 2: Seller A creates a product
  const product = await generate_random_shopping_mall_seller_products_create(
    sellerAConnection,
    {},
  );
  typia.assert(product);
  // Step 3: Seller A updates the product to create a snapshot
  const updatedProduct =
    await api.functional.shoppingMall.seller.products.update(
      sellerAConnection,
      {
        productId: product.id,
        body: {
          name: `${product.name} - Updated`,
          description: RandomGenerator.paragraph({ sentences: 3 }),
        } satisfies IShoppingMallProduct.IUpdate,
      },
    );
  typia.assert(updatedProduct);
  // Step 4: Register and authenticate Seller B (different seller)
  const sellerBConnection: api.IConnection = { host: connection.host };
  const sellerB = await authorize_seller_join(sellerBConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      shop_name: `SellerB_Shop_${RandomGenerator.alphabets(6)}`,
    },
  });
  typia.assert(sellerB);
  // Step 5: Seller B attempts to access Seller A's product snapshot
  // Using the product ID as snapshot ID (snapshots are created with same ID as product initially)
  // This should fail with 403 Forbidden as Seller B doesn't own this product
  await TestValidator.httpError(
    "Seller B cannot access Seller A's product snapshot",
    403,
    async () => {
      await api.functional.shoppingMall.seller.products.snapshots.at(
        sellerBConnection,
        {
          productId: product.id,
          snapshotId: product.id,
        },
      );
    },
  );
}
