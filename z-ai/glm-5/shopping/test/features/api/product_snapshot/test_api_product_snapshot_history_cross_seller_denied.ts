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
import { generate_random_shopping_mall_seller_products_create } from "../../../generate/generate_random_shopping_mall_seller_products_create";
import { prepare_random_shopping_mall_product } from "../../../prepare/prepare_random_shopping_mall_product";

/**
 * Test that a seller cannot view snapshot history for a product owned by another seller.
 *
 * This test verifies:
 * 1. Data isolation between sellers is enforced
 * 2. Sellers can only access snapshot history for products they own
 * 3. Cross-seller data access is prevented at the API level
 *
 * Test flow:
 * 1. First seller creates account and creates a product
 * 2. First seller edits the product to create snapshot history
 * 3. Second seller creates account
 * 4. Second seller attempts to access first seller's product snapshots
 * 5. Verify 403 Forbidden error is returned
 */
export async function test_api_product_snapshot_history_cross_seller_denied(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create first seller account and create a product
  const seller1Connection: api.IConnection = { host: connection.host };
  const seller1Auth = await authorize_seller_join(seller1Connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      shop_name: RandomGenerator.name(1),
      shop_description: RandomGenerator.paragraph(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(seller1Auth);
  // Create product for first seller
  const product = await generate_random_shopping_mall_seller_products_create(
    seller1Connection,
    {
      body: {
        name: RandomGenerator.name(2),
        description: RandomGenerator.content({ paragraphs: 2 }),
        basePrice: typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<1000>
        >(),
      },
    },
  );
  typia.assert(product);
  // Step 2: Edit the product to create snapshot history
  const updatedProduct =
    await api.functional.shoppingMall.seller.products.update(
      seller1Connection,
      {
        productId: product.id,
        body: {
          name: `${product.name} - Updated`,
          description: `${product.description} - Updated`,
          base_price: product.base_price + 1000,
        } satisfies IShoppingMallProduct.IUpdate,
      },
    );
  typia.assert(updatedProduct);
  // Step 3: Create second seller account
  const seller2Connection: api.IConnection = { host: connection.host };
  const seller2Auth = await authorize_seller_join(seller2Connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      shop_name: RandomGenerator.name(1),
      shop_description: RandomGenerator.paragraph(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(seller2Auth);
  // Verify sellers are different
  TestValidator.notEquals(
    "sellers have different IDs",
    seller1Auth.id,
    seller2Auth.id,
  );
  // Step 4: Second seller attempts to access first seller's product snapshots
  // This should fail with 403 Forbidden
  await TestValidator.httpError(
    "cross-seller snapshot access denied",
    403,
    async () => {
      await api.functional.shoppingMall.seller.products.snapshots.index(
        seller2Connection,
        {
          productId: product.id,
          body: {
            page: 1,
            limit: 20,
          } satisfies IShoppingMallProductSnapshot.IRequest,
        },
      );
    },
  );
}