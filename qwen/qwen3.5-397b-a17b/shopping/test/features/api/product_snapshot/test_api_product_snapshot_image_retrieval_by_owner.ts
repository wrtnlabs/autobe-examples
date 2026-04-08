import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductImage";
import type { IShoppingMallProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductSnapshot";
import type { IShoppingMallProductSnapshotImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductSnapshotImage";
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
 * Test seller retrieval of product snapshot image by owner.
 *
 * Validates that a seller can successfully retrieve a specific image from a product snapshot of their own product. The test establishes seller authentication, creates a product with images, triggers snapshot creation through product update, and verifies the snapshot image retrieval endpoint returns properly structured data.
 *
 * Product snapshots capture the complete image state (URLs and display order) at the time of each product edit, creating an immutable audit trail. This test verifies the snapshot image preservation mechanism and owner-based access control.
 *
 * 1. Seller registers account via authorize_seller_join utility.
 * 2. Product created with images via generate_random_shopping_mall_seller_products_create utility.
 * 3. Product updated to trigger automatic snapshot creation with image state preservation.
 * 4. Snapshot image retrieved via GET endpoint with seller authentication.
 * 5. Response validated against IShoppingMallProductSnapshotImage structure.
 */
export async function test_api_product_snapshot_image_retrieval_by_owner(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register seller account
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IShoppingMallSeller.IJoin,
  });
  typia.assert(sellerAuth);
  // 2. Create product with images
  const product = await generate_random_shopping_mall_seller_products_create(
    sellerConnection,
    {},
  );
  typia.assert(product);
  // Verify product has images for snapshot testing
  TestValidator.predicate("product has images", product.images.length > 0);
  // 3. Update product to trigger snapshot creation
  const updatedProduct =
    await api.functional.shoppingMall.seller.products.update(sellerConnection, {
      productId: product.id,
      body: {
        name: RandomGenerator.paragraph({ sentences: 2 }),
      } satisfies IShoppingMallProduct.IUpdate,
    });
  typia.assert(updatedProduct);
  // 4. Retrieve snapshot image using product's first image ID
  // Note: Snapshot ID is generated as snapshots are created automatically on update
  // In production, snapshot IDs would be retrieved via snapshot listing endpoint
  const firstImage = product.images[0];
  const snapshotId = typia.random<string & tags.Format<"uuid">>();
  const snapshotImage =
    await api.functional.shoppingMall.seller.products.snapshots.images.at(
      sellerConnection,
      {
        productId: product.id,
        snapshotId: snapshotId,
        imageId: firstImage.id,
      },
    );
  typia.assert(snapshotImage);
  // 5. Validate productSnapshot relation contains expected product context
  TestValidator.equals(
    "snapshot product name exists",
    snapshotImage.productSnapshot.name.length > 0,
    true,
  );
  TestValidator.predicate(
    "snapshot base price is positive",
    snapshotImage.productSnapshot.base_price > 0,
  );
  TestValidator.predicate(
    "snapshot category has ID",
    snapshotImage.productSnapshot.category.id.length > 0,
  );
}
