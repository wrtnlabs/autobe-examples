import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallProductSnapshotImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallProductSnapshotImage";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductImage";
import type { IShoppingMallProductSnapshotImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductSnapshotImage";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import type { IShoppingMallProductVariantOptionValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariantOptionValue";
import type { IShoppingMallReviewReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallReviewReview";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerProfile";
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
import { generate_random_shopping_mall_admin_categories_create } from "../../../generate/generate_random_shopping_mall_admin_categories_create";
import { generate_random_shopping_mall_seller_products_create } from "../../../generate/generate_random_shopping_mall_seller_products_create";
import { generate_random_shopping_mall_seller_products_images_create } from "../../../generate/generate_random_shopping_mall_seller_products_images_create";
import { prepare_random_shopping_mall_category } from "../../../prepare/prepare_random_shopping_mall_category";
import { prepare_random_shopping_mall_product } from "../../../prepare/prepare_random_shopping_mall_product";
import { prepare_random_shopping_mall_product_image } from "../../../prepare/prepare_random_shopping_mall_product_image";

/**
 * Test snapshot image retrieval after product edit triggers automatic snapshot.
 *
 * Validates that editing a product creates an immutable snapshot capturing the
 * complete image gallery state. The test verifies paginated snapshot image
 * retrieval returns all images with preserved URLs and display orders, that
 * originalImage references remain non-null when source images exist on the
 * live product, and that pagination and display_order range filtering work
 * correctly.
 *
 * 1. Administrator creates category and approves a seller registration.
 * 2. Seller creates a product and uploads three gallery images.
 * 3. Seller edits the product, triggering automatic snapshot creation.
 * 4. Retrieves snapshot images with default pagination and validates all
 *    images appear with correct display_order, non-null originalImage, and
 *    pagination metadata.
 * 5. Tests display_order range filtering using display_order_min and
 *    display_order_max to narrow results to a specific gallery range.
 * 6. Tests custom pagination with explicit page and limit parameters,
 *    verifying pagination metadata correctly reflects total records and
 *    page boundaries.
 */
export async function test_api_snapshot_images_retrieval_after_product_edit(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin setup
  const adminConnection: api.IConnection = { host: connection.host };
  const adminPassword = RandomGenerator.alphaNumeric(16);
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const admin = await authorize_admin_join(adminConnection, {
    body: { email: adminEmail, password: adminPassword },
  });
  typia.assert(admin);
  const category = await generate_random_shopping_mall_admin_categories_create(
    adminConnection,
    {},
  );
  typia.assert(category);
  // 2. Seller registration with known credentials
  const password = RandomGenerator.alphaNumeric(16);
  const email = typia.random<string & tags.Format<"email">>();
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller = await authorize_seller_join(sellerConnection, {
    body: { email, password },
  });
  typia.assert(seller);
  // Admin approves seller
  const approvedSeller =
    await api.functional.shoppingMall.admin.sellers.approve(adminConnection, {
      sellerId: seller.id,
    });
  typia.assert(approvedSeller);
  // Seller re-login with fresh connection after approval
  const sellerAuthConnection: api.IConnection = { host: connection.host };
  await authorize_seller_login(sellerAuthConnection, {
    body: {
      email,
      password,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  // 3. Create product and upload images
  const product = await generate_random_shopping_mall_seller_products_create(
    sellerAuthConnection,
    {
      body: { shopping_mall_category_id: category.id },
    },
  );
  typia.assert(product);
  const imageCount = 3;
  const uploadedImages: IShoppingMallProductImage[] = [];
  for (let i = 0; i < imageCount; i++) {
    const image =
      await generate_random_shopping_mall_seller_products_images_create(
        sellerAuthConnection,
        { params: { productId: product.id } },
      );
    typia.assert(image);
    uploadedImages.push(image);
  }
  // 4. Edit product to trigger automatic snapshot creation
  const updatedProduct =
    await api.functional.shoppingMall.seller.products.update(
      sellerAuthConnection,
      {
        productId: product.id,
        body: {
          name: RandomGenerator.paragraph({ sentences: 2 }),
          description: RandomGenerator.content({
            paragraphs: 2,
            sentenceMin: 3,
            sentenceMax: 5,
          }),
          shopping_mall_category_id: category.id,
          base_price: typia.random<
            number & tags.Type<"uint32"> & tags.Minimum<1>
          >() satisfies number as number,
        } satisfies IShoppingMallProduct.IUpdate,
      },
    );
  typia.assert(updatedProduct);
  // 5. Retrieve snapshot images with default pagination
  const snapshotId = typia.random<string & tags.Format<"uuid">>();
  const page1 =
    await api.functional.shoppingMall.seller.products.snapshots.images.index(
      sellerAuthConnection,
      {
        productId: product.id,
        snapshotId,
        body: {} satisfies IShoppingMallProductSnapshotImage.IRequest,
      },
    );
  typia.assert(page1);
  // Validate pagination metadata
  TestValidator.equals("pagination records count", page1.pagination.records, 3);
  TestValidator.equals("pagination pages count", page1.pagination.pages, 1);
  TestValidator.equals("pagination current page", page1.pagination.current, 1);
  // Validate all images present with correct display_order (ascending)
  TestValidator.equals("data length", page1.data.length, 3);
  for (let i = 0; i < page1.data.length; i++) {
    const snapshotImage = page1.data[i];
    TestValidator.equals(
      `display_order at index ${i}`,
      snapshotImage.display_order,
      i,
    );
    TestValidator.predicate(
      `image_url present at index ${i}`,
      snapshotImage.image_url.length > 0,
    );
    TestValidator.predicate(
      `originalImage non-null at index ${i}`,
      snapshotImage.originalImage !== null,
    );
    if (snapshotImage.originalImage !== null) {
      TestValidator.equals(
        `originalImage image_url matches uploaded at index ${i}`,
        snapshotImage.originalImage.image_url,
        uploadedImages[i].image_url,
      );
    }
  }
  // 6. Test display_order range filtering
  const filteredPage =
    await api.functional.shoppingMall.seller.products.snapshots.images.index(
      sellerAuthConnection,
      {
        productId: product.id,
        snapshotId,
        body: {
          display_order_min: 0,
          display_order_max: 1,
        } satisfies IShoppingMallProductSnapshotImage.IRequest,
      },
    );
  typia.assert(filteredPage);
  TestValidator.equals(
    "filtered pagination records",
    filteredPage.pagination.records,
    2,
  );
  TestValidator.equals("filtered data length", filteredPage.data.length, 2);
  TestValidator.equals(
    "filtered first display_order",
    filteredPage.data[0].display_order,
    0,
  );
  TestValidator.equals(
    "filtered second display_order",
    filteredPage.data[1].display_order,
    1,
  );
  // 7. Test custom pagination
  const paginatedPage =
    await api.functional.shoppingMall.seller.products.snapshots.images.index(
      sellerAuthConnection,
      {
        productId: product.id,
        snapshotId,
        body: {
          page: 1,
          limit: 2,
        } satisfies IShoppingMallProductSnapshotImage.IRequest,
      },
    );
  typia.assert(paginatedPage);
  TestValidator.equals(
    "paginated current page",
    paginatedPage.pagination.current,
    1,
  );
  TestValidator.equals("paginated limit", paginatedPage.pagination.limit, 2);
  TestValidator.equals(
    "paginated records",
    paginatedPage.pagination.records,
    3,
  );
  TestValidator.equals("paginated pages", paginatedPage.pagination.pages, 2);
  TestValidator.equals("paginated data length", paginatedPage.data.length, 2);
}
