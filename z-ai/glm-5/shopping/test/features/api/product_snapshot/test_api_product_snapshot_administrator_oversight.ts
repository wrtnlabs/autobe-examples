import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import type { IShoppingMallAdministratorGrade } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministratorGrade";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductImage";
import type { IShoppingMallProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductSnapshot";
import type { IShoppingMallProductSnapshotSku } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductSnapshotSku";
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
import { generate_random_shopping_mall_seller_products_create } from "../../../generate/generate_random_shopping_mall_seller_products_create";
import { prepare_random_shopping_mall_product } from "../../../prepare/prepare_random_shopping_mall_product";

/**
 * Test that an administrator can view snapshots of any product on the platform
 * through the seller endpoint, demonstrating platform-wide oversight capability.
 *
 * This test validates:
 * - Administrator cross-actor access to seller-scoped snapshot endpoints
 * - Snapshot creation triggered by product update
 * - Complete snapshot data integrity
 *
 * Test Flow:
 * 1. Seller creates a product
 * 2. Seller updates the product (triggers snapshot creation)
 * 3. Administrator accesses the snapshot through seller endpoint
 */
export async function test_api_product_snapshot_administrator_oversight(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create and authenticate seller
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {});
  typia.assert(sellerAuth);
  // Step 2: Seller creates a product
  const product = await generate_random_shopping_mall_seller_products_create(
    sellerConnection,
    {},
  );
  typia.assert(product);
  // Store original product data for later validation
  const originalName = product.name;
  const originalDescription = product.description;
  const originalBasePrice = product.base_price;
  // Step 3: Seller updates the product to trigger snapshot creation
  const updatedProduct =
    await api.functional.shoppingMall.seller.products.update(sellerConnection, {
      productId: product.id,
      body: {
        name: `${originalName} - Updated`,
        description: `${originalDescription} - Updated`,
        base_price: originalBasePrice + 1000,
      } satisfies IShoppingMallProduct.IUpdate,
    });
  typia.assert(updatedProduct);
  // Verify update was successful
  TestValidator.equals(
    "product name updated",
    updatedProduct.name,
    `${originalName} - Updated`,
  );
  TestValidator.predicate(
    "base price increased",
    updatedProduct.base_price > originalBasePrice,
  );
  // Step 4: Create and authenticate administrator for oversight
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_administrator_join(adminConnection, {});
  typia.assert(adminAuth);
  // Verify different actors
  TestValidator.notEquals(
    "different actors for seller and admin",
    sellerAuth.id,
    adminAuth.id,
  );
  // Verify seller owns the product
  TestValidator.equals(
    "seller owns the product",
    product.seller.id,
    sellerAuth.id,
  );
  // Step 5: Administrator retrieves the snapshot via seller endpoint
  // Retrieve the snapshot created during update - first snapshot for this product
  const snapshot =
    await api.functional.shoppingMall.seller.products.snapshots.at(
      adminConnection,
      {
        productId: product.id,
        snapshotId: updatedProduct.id, // Use product's first snapshot
      },
    );
  typia.assert(snapshot);
  // Validate snapshot contains original product state before update
  TestValidator.equals(
    "snapshot name matches original",
    snapshot.name,
    originalName,
  );
  TestValidator.equals(
    "snapshot description matches original",
    snapshot.description,
    originalDescription,
  );
  TestValidator.equals(
    "snapshot base price matches original",
    snapshot.basePrice,
    originalBasePrice,
  );
  // Validate snapshot references the correct product
  TestValidator.equals(
    "snapshot product ID matches",
    snapshot.product.id,
    product.id,
  );
  // Validate snapshot has required fields
  TestValidator.predicate("snapshot has valid ID", snapshot.id.length > 0);
  TestValidator.predicate(
    "snapshot has valid timestamp",
    snapshot.createdAt.length > 0,
  );
  // Validate images array exists
  TestValidator.predicate(
    "images array exists",
    Array.isArray(snapshot.images),
  );
  // Validate skuSnapshots array exists
  TestValidator.predicate(
    "skuSnapshots array exists",
    Array.isArray(snapshot.skuSnapshots),
  );
}
