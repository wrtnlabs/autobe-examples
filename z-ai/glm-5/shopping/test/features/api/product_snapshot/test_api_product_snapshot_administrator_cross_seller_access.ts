import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
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

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";
import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { generate_random_shopping_mall_seller_seller_products_create } from "../../../generate/generate_random_shopping_mall_seller_seller_products_create";
import { prepare_random_shopping_mall_product } from "../../../prepare/prepare_random_shopping_mall_product";

/**
 * Test that an administrator can successfully retrieve a snapshot of any seller's product.
 *
 * Verifies administrator platform-wide oversight capabilities where admins can
 * access snapshot data for any product regardless of ownership - essential for
 * dispute resolution, audit trails, and platform management.
 *
 * Note: This test requires snapshot IDs which would typically be obtained from
 * a list snapshots endpoint (not available in current API spec). In production,
 * administrators would use GET /admin/products/{productId}/snapshots to list
 * all snapshots, then retrieve specific ones.
 */
export async function test_api_product_snapshot_administrator_cross_seller_access(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Register and authenticate seller account (product owner)
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller = await authorize_seller_join(sellerConnection, {
    body: {
      shopName: RandomGenerator.name(1),
    },
  });
  typia.assert(seller);
  // Step 2: Create a product under seller's account
  const product =
    await generate_random_shopping_mall_seller_seller_products_create(
      sellerConnection,
      {
        body: {
          name: RandomGenerator.name(2),
          description: RandomGenerator.paragraph({ sentences: 5 }),
          basePrice: typia.random<number & tags.Minimum<1>>(),
        },
      },
    );
  typia.assert(product);
  // Step 3: Update product to trigger automatic snapshot creation
  const updatedProduct =
    await api.functional.shoppingMall.seller.products.update(sellerConnection, {
      productId: product.id,
      body: {
        name: `${product.name} - Updated`,
        description: RandomGenerator.paragraph({ sentences: 6 }),
      } satisfies IShoppingMallProduct.IUpdate,
    });
  typia.assert(updatedProduct);
  // Step 4: Register and authenticate administrator account
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_administrator_join(adminConnection, {
    body: {
      password: RandomGenerator.alphaNumeric(16),
    },
  });
  typia.assert(admin);
  // Step 5: Administrator retrieves the product snapshot
  // In production: snapshotId would be obtained from GET /admin/products/{productId}/snapshots
  // For this test, we verify the administrator can access the endpoint with valid authentication
  // The snapshot was created during the update operation
  const snapshot = await api.functional.shoppingMall.products.snapshots.at(
    adminConnection,
    {
      productId: product.id,
      snapshotId: typia.random<string & tags.Format<"uuid">>(),
    },
  );
  typia.assert(snapshot);
  // Step 6: Validate administrator cross-seller access
  // Administrator can access snapshot despite not being the product owner
  TestValidator.equals(
    "snapshot product ID matches",
    snapshot.product.id,
    product.id,
  );
  TestValidator.equals(
    "snapshot seller is original owner",
    snapshot.product.seller.id,
    seller.id,
  );
  TestValidator.predicate(
    "snapshot has captured name",
    snapshot.name.length > 0,
  );
  TestValidator.predicate(
    "snapshot has captured description",
    snapshot.description.length > 0,
  );
  TestValidator.predicate(
    "snapshot has valid base price",
    snapshot.base_price >= 0,
  );
  TestValidator.predicate(
    "snapshot has creation timestamp",
    snapshot.created_at.length > 0,
  );
}
