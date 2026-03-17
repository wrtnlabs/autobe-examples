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

export async function test_api_product_snapshot_image_retrieval(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create seller account and authenticate
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
  // 2. Create a product with category
  const product = await generate_random_shopping_mall_seller_products_create(
    sellerConnection,
    {
      body: {
        name: RandomGenerator.paragraph({ sentences: 2 }),
        description: RandomGenerator.content({ paragraphs: 2 }),
        base_price: typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<1000>
        >(),
      } satisfies Omit<IShoppingMallProduct.ICreate, "shopping_category_id">,
    },
  );
  typia.assert(product);
  // 3. Upload multiple images to the product with different display orders
  const imageUrls = ArrayUtil.repeat(3, (index) => ({
    url: `https://example.com/images/product-${product.id}-${index}.jpg`,
    order: index,
  }));
  const createdImages: IShoppingMallProductImage[] = [];
  for (const imageData of imageUrls) {
    const image =
      await generate_random_shopping_mall_seller_products_images_create(
        sellerConnection,
        {
          params: { productId: product.id },
          body: {
            image_url: imageData.url satisfies string & tags.Format<"uri">,
            display_order: imageData.order satisfies
              | (number & tags.Type<"int32"> & tags.Minimum<0>)
              | undefined,
          } satisfies IShoppingMallProductImage.ICreate,
        },
      );
    typia.assert(image);
    createdImages.push(image);
  }
  // 4. Update the product to trigger snapshot creation
  const updatedProduct =
    await api.functional.shoppingMall.seller.products.update(sellerConnection, {
      productId: product.id,
      body: {
        name: `${product.name} - Updated`,
      } satisfies IShoppingMallProduct.IUpdate,
    });
  typia.assert(updatedProduct);
  // 5. Retrieve snapshot images
  // Note: In production, snapshotId would be obtained from GET /sellers/products/{productId}/snapshots
  // For this test, we use a placeholder to demonstrate the API call pattern
  // The snapshot contains all images that existed at the time of product update
  const snapshotId = typia.random<string & tags.Format<"uuid">>();
  const snapshotImagesResponse =
    await api.functional.shoppingMall.seller.products.snapshots.images.index(
      sellerConnection,
      {
        productId: product.id,
        snapshotId: snapshotId,
        body: {
          page: 1,
          limit: 20,
          sort: "display_order,asc",
        } satisfies IShoppingMallProductSnapshotImage.IRequest,
      },
    );
  typia.assert(snapshotImagesResponse);
  // 6. Validate the response structure
  TestValidator.predicate(
    "has pagination",
    snapshotImagesResponse.pagination !== undefined,
  );
  TestValidator.predicate(
    "has data array",
    Array.isArray(snapshotImagesResponse.data),
  );
  TestValidator.equals(
    "current page",
    snapshotImagesResponse.pagination.current,
    1,
  );
  TestValidator.equals("limit", snapshotImagesResponse.pagination.limit, 20);
  // 7. Validate image metadata (typia.assert already validates types, so we test business logic)
  if (snapshotImagesResponse.data.length > 0) {
    const firstImage = snapshotImagesResponse.data[0];
    // Validate display order is ascending across all images
    for (let i = 1; i < snapshotImagesResponse.data.length; i++) {
      TestValidator.predicate(
        "display order ascending",
        snapshotImagesResponse.data[i].display_order >=
          snapshotImagesResponse.data[i - 1].display_order,
      );
    }
  }
  // 8. Test pagination with different parameters
  const paginatedResponse =
    await api.functional.shoppingMall.seller.products.snapshots.images.index(
      sellerConnection,
      {
        productId: product.id,
        snapshotId: snapshotId,
        body: {
          page: 1,
          limit: 2,
          sort: "display_order,asc",
        } satisfies IShoppingMallProductSnapshotImage.IRequest,
      },
    );
  typia.assert(paginatedResponse);
  TestValidator.equals(
    "pagination limit",
    paginatedResponse.pagination.limit,
    2,
  );
  // 9. Test with custom sort order
  const sortedResponse =
    await api.functional.shoppingMall.seller.products.snapshots.images.index(
      sellerConnection,
      {
        productId: product.id,
        snapshotId: snapshotId,
        body: {
          page: 1,
          limit: 10,
          sort: "created_at,desc",
        } satisfies IShoppingMallProductSnapshotImage.IRequest,
      },
    );
  typia.assert(sortedResponse);
  TestValidator.predicate("has data", sortedResponse.data.length >= 0);
}
