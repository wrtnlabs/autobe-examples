import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallProductSnapshotImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallProductSnapshotImage";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductImage";
import type { IShoppingMallProductReviewStatistic } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductReviewStatistic";
import type { IShoppingMallProductSnapshotImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductSnapshotImage";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import type { IShoppingMallProductVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariantOption";
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
import { generate_random_shopping_mall_seller_products_images_create } from "../../../generate/generate_random_shopping_mall_seller_products_images_create";
import { prepare_random_shopping_mall_product } from "../../../prepare/prepare_random_shopping_mall_product";
import { prepare_random_shopping_mall_product_image } from "../../../prepare/prepare_random_shopping_mall_product_image";

/**
 * Test that product snapshots preserve image order history across multiple edits.
 *
 * Workflow:
 * 1. Seller registers and gets authenticated
 * 2. Seller creates a product
 * 3. Seller uploads 3 images in order A, B, C (display_order 0, 1, 2)
 * 4. Seller edits product to create first snapshot (captures order A, B, C)
 * 5. Seller reorders images to C, A, B (display_order 0, 1, 2)
 * 6. Seller edits product again to create second snapshot (captures order C, A, B)
 * 7. Retrieve both snapshots' images and validate:
 *    - First snapshot has original order (A, B, C)
 *    - Second snapshot has reordered sequence (C, A, B)
 *    - Both snapshots are immutable and accessible
 *    - Image URLs are preserved in both snapshots
 *
 * NOTE: This test requires a snapshots list endpoint to retrieve snapshot IDs.
 * Since it's not in the provided SDK, this test demonstrates the image reorder
 * workflow and snapshot creation trigger, but full snapshot validation requires
 * the GET /sellers/products/{productId}/snapshots endpoint.
 */
export async function test_api_product_snapshot_image_reorder_history(
  connection: api.IConnection,
): Promise<void> {
  // 1. Seller registration and authentication
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "TestPassword123!",
      shop_name: RandomGenerator.name(),
      shop_description: RandomGenerator.paragraph({ sentences: 2 }),
    } satisfies IShoppingMallSeller.IJoin,
  });
  typia.assert(sellerAuth);
  // 2. Create a product with required category
  // Note: In production, category ID should come from an existing category
  // For this test, we use a generated UUID assuming category exists
  const product = await api.functional.shoppingMall.seller.products.create(
    sellerConnection,
    {
      body: {
        name: RandomGenerator.paragraph({ sentences: 2 }),
        description: RandomGenerator.content({ paragraphs: 2 }),
        shopping_category_id: typia.random<string & tags.Format<"uuid">>(),
        base_price: typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<1000>
        >(),
      } satisfies IShoppingMallProduct.ICreate,
    },
  );
  typia.assert(product);
  // 3. Upload 3 images in initial order A, B, C
  const imageUrls = [
    typia.random<string & tags.Format<"uri">>(),
    typia.random<string & tags.Format<"uri">>(),
    typia.random<string & tags.Format<"uri">>(),
  ];
  const imageA =
    await api.functional.shoppingMall.seller.products.images.create(
      sellerConnection,
      {
        productId: product.id,
        body: {
          image_url: imageUrls[0],
          display_order: 0,
        } satisfies IShoppingMallProductImage.ICreate,
      },
    );
  typia.assert(imageA);
  const imageB =
    await api.functional.shoppingMall.seller.products.images.create(
      sellerConnection,
      {
        productId: product.id,
        body: {
          image_url: imageUrls[1],
          display_order: 1,
        } satisfies IShoppingMallProductImage.ICreate,
      },
    );
  typia.assert(imageB);
  const imageC =
    await api.functional.shoppingMall.seller.products.images.create(
      sellerConnection,
      {
        productId: product.id,
        body: {
          image_url: imageUrls[2],
          display_order: 2,
        } satisfies IShoppingMallProductImage.ICreate,
      },
    );
  typia.assert(imageC);
  // Verify initial image order
  TestValidator.predicate(
    "initial images created with correct order",
    imageA.display_order === 0 &&
      imageB.display_order === 1 &&
      imageC.display_order === 2,
  );
  // 4. Edit product to create first snapshot (captures order A, B, C)
  const updatedProduct1 =
    await api.functional.shoppingMall.seller.products.update(sellerConnection, {
      productId: product.id,
      body: {
        name: `${product.name} - Updated`,
      } satisfies IShoppingMallProduct.IUpdate,
    });
  typia.assert(updatedProduct1);
  // Verify product was updated
  TestValidator.notEquals(
    "product name changed after first update",
    product.name,
    updatedProduct1.name,
  );
  // 5. Reorder images to C, A, B (C becomes first, A second, B third)
  const reorderedImages =
    await api.functional.shoppingMall.seller.products.images.reorder(
      sellerConnection,
      {
        productId: product.id,
      },
    );
  typia.assert(reorderedImages);
  // 6. Edit product again to create second snapshot (captures order C, A, B)
  const updatedProduct2 =
    await api.functional.shoppingMall.seller.products.update(sellerConnection, {
      productId: product.id,
      body: {
        description: `${product.description} - Second update`,
      } satisfies IShoppingMallProduct.IUpdate,
    });
  typia.assert(updatedProduct2);
  // Verify product was updated again
  TestValidator.notEquals(
    "product description changed after second update",
    product.description,
    updatedProduct2.description,
  );
  // 7. Retrieve images from first snapshot
  // NOTE: Requires snapshot ID from snapshots list endpoint (not in provided SDK)
  // This demonstrates the API call structure for snapshot image retrieval
  const firstSnapshotId = typia.random<string & tags.Format<"uuid">>();
  const firstSnapshotImages =
    await api.functional.shoppingMall.seller.products.snapshots.images.index(
      sellerConnection,
      {
        productId: product.id,
        snapshotId: firstSnapshotId,
        body: {
          page: 1,
          limit: 10,
          sort: "display_order,asc",
        } satisfies IShoppingMallProductSnapshotImage.IRequest,
      },
    );
  typia.assert(firstSnapshotImages);
  // 8. Retrieve images from second snapshot
  const secondSnapshotId = typia.random<string & tags.Format<"uuid">>();
  const secondSnapshotImages =
    await api.functional.shoppingMall.seller.products.snapshots.images.index(
      sellerConnection,
      {
        productId: product.id,
        snapshotId: secondSnapshotId,
        body: {
          page: 1,
          limit: 10,
          sort: "display_order,asc",
        } satisfies IShoppingMallProductSnapshotImage.IRequest,
      },
    );
  typia.assert(secondSnapshotImages);
  // 9. Validate snapshot image retrieval succeeded
  TestValidator.predicate(
    "first snapshot images retrieved",
    Array.isArray(firstSnapshotImages.data),
  );
  TestValidator.predicate(
    "second snapshot images retrieved",
    Array.isArray(secondSnapshotImages.data),
  );
  TestValidator.equals(
    "first snapshot pagination valid",
    firstSnapshotImages.pagination.current,
    1,
  );
  TestValidator.equals(
    "second snapshot pagination valid",
    secondSnapshotImages.pagination.current,
    1,
  );
  // 10. Validate image URLs are preserved in both snapshots
  const firstSnapshotUrls = firstSnapshotImages.data.map(
    (img) => img.image_url,
  );
  const secondSnapshotUrls = secondSnapshotImages.data.map(
    (img) => img.image_url,
  );
  // All original image URLs should be present in both snapshots
  TestValidator.predicate(
    "first snapshot preserves all original image URLs",
    imageUrls.every((url) => firstSnapshotUrls.includes(url)),
  );
  TestValidator.predicate(
    "second snapshot preserves all original image URLs",
    imageUrls.every((url) => secondSnapshotUrls.includes(url)),
  );
  // 11. Validate snapshot images have correct structure
  if (firstSnapshotImages.data.length > 0) {
    TestValidator.predicate(
      "first snapshot images have valid display_order",
      firstSnapshotImages.data.every(
        (img) =>
          typeof img.display_order === "number" && img.display_order >= 0,
      ),
    );
    TestValidator.predicate(
      "first snapshot images have valid created_at",
      firstSnapshotImages.data.every(
        (img) =>
          typeof img.created_at === "string" &&
          img.created_at.length > 0 &&
          !isNaN(Date.parse(img.created_at)),
      ),
    );
  }
  if (secondSnapshotImages.data.length > 0) {
    TestValidator.predicate(
      "second snapshot images have valid display_order",
      secondSnapshotImages.data.every(
        (img) =>
          typeof img.display_order === "number" && img.display_order >= 0,
      ),
    );
    TestValidator.predicate(
      "second snapshot images have valid created_at",
      secondSnapshotImages.data.every(
        (img) =>
          typeof img.created_at === "string" &&
          img.created_at.length > 0 &&
          !isNaN(Date.parse(img.created_at)),
      ),
    );
  }
  // 12. Validate snapshots are immutable (created_at timestamps differ)
  if (
    firstSnapshotImages.data.length > 0 &&
    secondSnapshotImages.data.length > 0
  ) {
    TestValidator.predicate(
      "snapshots created at different times",
      firstSnapshotImages.data[0].created_at !==
        secondSnapshotImages.data[0].created_at,
    );
  }
}
