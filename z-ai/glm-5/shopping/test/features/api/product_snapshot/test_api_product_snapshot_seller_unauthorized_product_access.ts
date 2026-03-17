import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallProductSnapshot";
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
 * Test authorization boundary enforcement by verifying that a seller cannot
 * access snapshot history for products owned by another seller. This validates
 * data isolation and ownership security for product edit history.
 *
 * **Setup Steps**:
 * 1. First seller account registration (Seller A - unauthorized accessor)
 * 2. Second seller account registration (Seller B - product owner)
 * 3. Product creation by Seller B (captures productId owned by Seller B)
 * 4. Product update by Seller B (creates snapshot in Seller B's product)
 *
 * **Test Execution**:
 * Call PATCH /products/{productId}/snapshots with Seller A's authentication
 * token and productId from Seller B's product.
 *
 * **Validations**:
 * - Response status 403 Forbidden
 * - Authorization logic prevents cross-seller snapshot access
 * - Data isolation enforced
 */
export async function test_api_product_snapshot_seller_unauthorized_product_access(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create Seller A (unauthorized accessor)
  const sellerAConnection: api.IConnection = { host: connection.host };
  const sellerA = await authorize_seller_join(sellerAConnection, {});
  typia.assert(sellerA);
  // 2. Create Seller B (product owner)
  const sellerBConnection: api.IConnection = { host: connection.host };
  const sellerB = await authorize_seller_join(sellerBConnection, {});
  typia.assert(sellerB);
  // 3. Create product owned by Seller B
  const product =
    await generate_random_shopping_mall_seller_seller_products_create(
      sellerBConnection,
      {},
    );
  typia.assert(product);
  // 4. Update product by Seller B (creates snapshot)
  const updatedProduct =
    await api.functional.shoppingMall.seller.products.update(
      sellerBConnection,
      {
        productId: product.id,
        body: {
          name: RandomGenerator.name(),
          description: RandomGenerator.paragraph({ sentences: 3 }),
        } satisfies IShoppingMallProduct.IUpdate,
      },
    );
  typia.assert(updatedProduct);
  // 5. Attempt to access snapshots with Seller A's connection (should fail with 403)
  await TestValidator.httpError(
    "seller cannot access another seller's product snapshots",
    403,
    async () => {
      await api.functional.shoppingMall.products.snapshots.index(
        sellerAConnection,
        {
          productId: product.id,
          body: {} satisfies IShoppingMallProductSnapshot.IRequest,
        },
      );
    },
  );
}
