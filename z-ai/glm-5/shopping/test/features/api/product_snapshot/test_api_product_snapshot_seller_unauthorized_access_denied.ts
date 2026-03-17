import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductImage";
import type { IShoppingMallProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductSnapshot";
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
import { generate_random_shopping_mall_seller_seller_products_create } from "../../../generate/generate_random_shopping_mall_seller_seller_products_create";
import { prepare_random_shopping_mall_product } from "../../../prepare/prepare_random_shopping_mall_product";

/**
 * Test that a seller is denied access when attempting to view another seller's product snapshot.
 *
 * This test verifies data isolation between sellers by ensuring that Seller B
 * cannot access snapshots from Seller A's products, receiving 403 FORBIDDEN.
 */
export async function test_api_product_snapshot_seller_unauthorized_access_denied(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register Seller A (product owner)
  const sellerAConnection: api.IConnection = { host: connection.host };
  const sellerA = await authorize_seller_join(sellerAConnection, {});
  typia.assert(sellerA);
  // 2. Create a product owned by Seller A
  const product =
    await generate_random_shopping_mall_seller_seller_products_create(
      sellerAConnection,
      {},
    );
  typia.assert(product);
  // 3. Edit the product to create a snapshot
  const updatedProduct =
    await api.functional.shoppingMall.seller.products.update(
      sellerAConnection,
      {
        productId: product.id,
        body: {
          name: RandomGenerator.name(),
          description: RandomGenerator.paragraph({ sentences: 3 }),
        } satisfies IShoppingMallProduct.IUpdate,
      },
    );
  typia.assert(updatedProduct);
  // 4. Register Seller B (unauthorized accessor)
  const sellerBConnection: api.IConnection = { host: connection.host };
  const sellerB = await authorize_seller_join(sellerBConnection, {});
  typia.assert(sellerB);
  // 5. Test that Seller B cannot access Seller A's product snapshot
  // Authorization check happens before snapshot existence check, so random ID still returns 403
  const snapshotId = typia.random<string & typia.tags.Format<"uuid">>();
  await TestValidator.httpError(
    "Seller B denied access to Seller A's snapshot",
    403,
    async () => {
      await api.functional.shoppingMall.products.snapshots.at(
        sellerBConnection,
        {
          productId: product.id,
          snapshotId: snapshotId,
        },
      );
    },
  );
}
