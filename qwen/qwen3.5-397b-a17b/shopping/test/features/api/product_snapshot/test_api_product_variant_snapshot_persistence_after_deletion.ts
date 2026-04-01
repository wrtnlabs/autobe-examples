import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallProductSnapshot";
import type { IPageIShoppingMallProductSnapshotVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallProductSnapshotVariant";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductImage";
import type { IShoppingMallProductOptionDefinition } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductOptionDefinition";
import type { IShoppingMallProductOptionValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductOptionValue";
import type { IShoppingMallProductRating } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductRating";
import type { IShoppingMallProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductSnapshot";
import type { IShoppingMallProductSnapshotVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductSnapshotVariant";
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
import { generate_random_shopping_mall_seller_products_variants_create } from "../../../generate/generate_random_shopping_mall_seller_products_variants_create";
import { prepare_random_shopping_mall_product } from "../../../prepare/prepare_random_shopping_mall_product";
import { prepare_random_shopping_mall_product_variant } from "../../../prepare/prepare_random_shopping_mall_product_variant";

/**
 * Test that variant snapshots remain accessible and intact after the parent product is deleted.
 *
 * This test validates the business rule that snapshots are immutable and preserved even after
 * product deletion, enabling historical reconstruction and dispute resolution for deleted products.
 *
 * Test Flow:
 * 1. Administrator creates account and logs in
 * 2. Seller creates account and logs in
 * 3. Seller creates a product with specific variant (SKU: 'PERSIST-001', price_override: 20000)
 * 4. Seller edits the product to trigger snapshot creation
 * 5. Administrator retrieves product snapshots and variant snapshots to get IDs
 * 6. Seller deletes the product
 * 7. Administrator verifies variant snapshot is still accessible via the target endpoint
 * 8. Verify snapshot data is complete and intact with original values preserved
 */
export async function test_api_product_variant_snapshot_persistence_after_deletion(
  connection: api.IConnection,
): Promise<void> {
  // Store credentials for login
  const adminPassword = RandomGenerator.alphaNumeric(16);
  const sellerPassword = RandomGenerator.alphaNumeric(16);
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminHref = typia.random<string & tags.Format<"uri">>();
  const adminReferrer = typia.random<string & tags.Format<"uri">>();
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const sellerHref = typia.random<string & tags.Format<"uri">>();
  const sellerReferrer = typia.random<string & tags.Format<"uri">>();
  // 1. Administrator setup - create account
  const adminJoinConnection: api.IConnection = { host: connection.host };
  const adminJoin = await authorize_administrator_join(adminJoinConnection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      href: adminHref,
      referrer: adminReferrer,
    } satisfies IShoppingMallAdministrator.IJoin,
  });
  typia.assert(adminJoin);
  // Administrator login
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_administrator_login(adminConnection, {
    body: {
      email: adminEmail,
      password: adminPassword,
    } satisfies IShoppingMallAdministrator.ILogin,
  });
  // 2. Seller setup - create account
  const sellerJoinConnection: api.IConnection = { host: connection.host };
  const sellerJoin = await authorize_seller_join(sellerJoinConnection, {
    body: {
      email: sellerEmail,
      password: sellerPassword,
      href: sellerHref,
      referrer: sellerReferrer,
    } satisfies IShoppingMallSeller.IJoin,
  });
  typia.assert(sellerJoin);
  // Seller login - must include href and referrer (required fields in IShoppingMallSeller.ILogin)
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_login(sellerConnection, {
    body: {
      email: sellerEmail,
      password: sellerPassword,
      href: sellerHref,
      referrer: sellerReferrer,
    } satisfies IShoppingMallSeller.ILogin,
  });
  // 3. Create product with specific variant
  const product = await generate_random_shopping_mall_seller_products_create(
    sellerConnection,
    {
      body: {
        name: RandomGenerator.paragraph({ sentences: 2 }),
        description: RandomGenerator.content({ paragraphs: 2 }),
        category_id: typia.random<string & tags.Format<"uuid">>(),
        base_price: 15000,
      } satisfies IShoppingMallProduct.ICreate,
    },
  );
  typia.assert(product);
  // 4. Create variant with specific SKU and price_override
  const variant =
    await generate_random_shopping_mall_seller_products_variants_create(
      sellerConnection,
      {
        body: {
          sku_code: "PERSIST-001",
          price_override: 20000,
          option_value_ids: [],
        } satisfies IShoppingMallProductVariant.ICreate,
        params: {
          productId: product.id,
        },
      },
    );
  typia.assert(variant);
  // 5. Edit the product to trigger snapshot creation
  const updatedProduct =
    await api.functional.shoppingMall.seller.products.update(sellerConnection, {
      productId: product.id,
      body: {
        name: `${product.name} - Updated`,
        base_price: 18000,
      } satisfies IShoppingMallProduct.IUpdate,
    });
  typia.assert(updatedProduct);
  // 6. Retrieve product snapshots to get snapshot ID
  const productSnapshots =
    await api.functional.shoppingMall.administrator.products.snapshots.index(
      adminConnection,
      {
        productId: product.id,
        body: {
          page: 1,
          limit: 10,
        } satisfies IShoppingMallProductSnapshot.IRequest,
      },
    );
  typia.assert(productSnapshots);
  TestValidator.predicate(
    "has snapshots",
    () => productSnapshots.data.length > 0,
  );
  // Get the most recent snapshot (from the update)
  const snapshot = productSnapshots.data[0];
  const snapshotId = snapshot.id;
  // 7. Retrieve variant snapshots to get variant snapshot ID
  const variantSnapshots =
    await api.functional.shoppingMall.administrator.products.snapshots.variants.index(
      adminConnection,
      {
        productId: product.id,
        snapshotId: snapshotId,
        body: {
          page: 1,
          limit: 10,
        } satisfies IShoppingMallProductSnapshotVariant.IRequest,
      },
    );
  typia.assert(variantSnapshots);
  TestValidator.predicate(
    "has variant snapshots",
    () => variantSnapshots.data.length > 0,
  );
  // Find the variant snapshot with our specific SKU
  const variantSnapshot = variantSnapshots.data.find(
    (vs) => vs.sku_code === "PERSIST-001",
  );
  TestValidator.predicate(
    "variant snapshot exists",
    () => variantSnapshot !== undefined,
  );
  const variantSnapshotId = variantSnapshot!.id;
  // 8. Delete the product
  await api.functional.shoppingMall.seller.products.erase(sellerConnection, {
    productId: product.id,
  });
  // 9. Retrieve the variant snapshot after product deletion - this should succeed
  const retrievedVariantSnapshot =
    await api.functional.shoppingMall.administrator.products.snapshots.variants.at(
      adminConnection,
      {
        productId: product.id,
        snapshotId: snapshotId,
        variantSnapshotId: variantSnapshotId,
      },
    );
  typia.assert(retrievedVariantSnapshot);
  // 10. Verify snapshot data is intact with original values
  TestValidator.equals(
    "SKU code preserved",
    retrievedVariantSnapshot.sku_code,
    "PERSIST-001",
  );
  TestValidator.equals(
    "Price override preserved",
    retrievedVariantSnapshot.price_override,
    20000,
  );
  TestValidator.predicate(
    "Stock quantity is valid",
    () => retrievedVariantSnapshot.stock_quantity >= 0,
  );
  TestValidator.equals(
    "Snapshot ID matches",
    retrievedVariantSnapshot.id,
    variantSnapshotId,
  );
}
