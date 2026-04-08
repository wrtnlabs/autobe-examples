import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import type { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import type { IEcommerceMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductImage";
import type { IEcommerceMallProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductSnapshot";
import type { IEcommerceMallProductSnapshotImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductSnapshotImage";
import type { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import type { IEcommerceMallProductVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariantOption";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallSellerProfileSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfileSnapshot";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallProductSnapshot";
import type { IPageIEcommerceMallProductSnapshotImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallProductSnapshotImage";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { generate_random_ecommerce_mall_admin_categories_create } from "../../../generate/generate_random_ecommerce_mall_admin_categories_create";
import { generate_random_ecommerce_mall_seller_products_create } from "../../../generate/generate_random_ecommerce_mall_seller_products_create";
import { generate_random_ecommerce_mall_seller_products_images_create } from "../../../generate/generate_random_ecommerce_mall_seller_products_images_create";
import { prepare_random_ecommerce_mall_category } from "../../../prepare/prepare_random_ecommerce_mall_category";
import { prepare_random_ecommerce_mall_product } from "../../../prepare/prepare_random_ecommerce_mall_product";
import { prepare_random_ecommerce_mall_product_image } from "../../../prepare/prepare_random_ecommerce_mall_product_image";

/**
 * Test successful retrieval of a product snapshot image by the product owner (seller).
 *
 * This test validates that a seller can successfully retrieve a specific snapshot image
 * that was captured when the product was updated. The flow tests:
 * 1. Admin creates category (dependency for product creation)
 * 2. Seller creates product
 * 3. Seller uploads product image
 * 4. Seller updates product (triggers snapshot creation)
 * 5. Seller queries snapshots to get snapshotId
 * 6. Seller queries snapshot images to get imageId
 * 7. Seller retrieves specific snapshot image by ID
 *
 * Expected result: IEcommerceMallProductSnapshotImage with id, url, displayOrder, createdAt.
 */
export async function test_api_product_snapshot_image_retrieval_by_owner_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin setup - authenticate and create category
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "AdminPassword123!",
      href: "https://test.example.com/admin",
      referrer: "https://test.example.com/",
      ip: "127.0.0.1",
    },
  });
  const category = await generate_random_ecommerce_mall_admin_categories_create(
    adminConnection,
    {
      body: {
        name: RandomGenerator.name(),
        description: "Test category for product snapshot image retrieval test",
      },
    },
  );
  typia.assert(category);
  // 2. Seller authentication
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const sellerPassword = "SellerPassword123!";
  await authorize_seller_join(sellerConnection, {
    body: {
      email: sellerEmail,
      password: sellerPassword,
      href: "https://test.example.com/seller",
      referrer: "https://test.example.com/",
      ip: "127.0.0.1",
    },
  });
  // 3. Create product
  const product = await generate_random_ecommerce_mall_seller_products_create(
    sellerConnection,
    {
      body: {
        name: RandomGenerator.paragraph({ sentences: 3 }),
        description: RandomGenerator.content({ paragraphs: 2 }),
        categoryId: category.id,
        basePrice: 10000,
      },
    },
  );
  typia.assert(product);
  // 4. Upload image to product
  const image =
    await generate_random_ecommerce_mall_seller_products_images_create(
      sellerConnection,
      {
        params: { productId: product.id },
        body: {
          imageUrl: "https://example.com/test-product-image.jpg",
        },
      },
    );
  typia.assert(image);
  // 5. Update product to trigger snapshot creation
  const updateBody = {
    name: product.name + " (Updated)",
    description: product.description + " (Updated description)",
    basePrice: product.base_price + 1000,
  } satisfies IEcommerceMallProduct.IUpdate;
  await api.functional.ecommerceMall.seller.products.update(sellerConnection, {
    productId: product.id,
    body: updateBody,
  });
  // 6. Query product snapshots to get snapshotId
  const snapshotsResponse: IPageIEcommerceMallProductSnapshot.ISummary =
    await api.functional.ecommerceMall.seller.products.snapshots.index(
      sellerConnection,
      {
        productId: product.id,
        body: {
          createdAtFrom: null,
          createdAtTo: null,
          sort: "created_at_DESC",
          limit: 10,
          cursor: null,
        } satisfies IEcommerceMallProductSnapshot.IRequest,
      },
    );
  typia.assert(snapshotsResponse);
  // Verify snapshots exist and get the latest snapshot
  if (snapshotsResponse.data.length === 0) {
    throw new Error("No snapshots found after product update");
  }
  const latestSnapshot = snapshotsResponse.data[0];
  // 7. Query snapshot images to get imageId
  const snapshotImagesResponse: IPageIEcommerceMallProductSnapshotImage.ISummary =
    await api.functional.ecommerceMall.seller.productSnapshots.images.index(
      sellerConnection,
      {
        snapshotId: latestSnapshot.id,
        body: {
          page: 1,
          limit: 10,
        } satisfies IEcommerceMallProductSnapshotImage.IRequest,
      },
    );
  typia.assert(snapshotImagesResponse);
  // Verify snapshot images exist
  if (snapshotImagesResponse.data.length === 0) {
    throw new Error("No snapshot images found in the snapshot");
  }
  const snapshotImage = snapshotImagesResponse.data[0];
  // 8. Retrieve specific snapshot image by ID
  const retrievedImage: IEcommerceMallProductSnapshotImage =
    await api.functional.ecommerceMall.seller.productSnapshots.images.at(
      sellerConnection,
      {
        snapshotId: latestSnapshot.id,
        imageId: snapshotImage.id,
      },
    );
  typia.assert(retrievedImage);
  // 9. Business logic validation
  TestValidator.equals("image id matches", retrievedImage.id, snapshotImage.id);
  TestValidator.equals(
    "image url matches",
    retrievedImage.url,
    snapshotImage.url,
  );
  TestValidator.equals(
    "display order matches",
    retrievedImage.displayOrder,
    snapshotImage.display_order,
  );
}
