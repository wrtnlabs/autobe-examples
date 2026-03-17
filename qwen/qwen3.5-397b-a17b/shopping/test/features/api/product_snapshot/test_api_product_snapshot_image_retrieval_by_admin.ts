import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallProductSnapshot";
import type { IPageIShoppingMallProductSnapshotImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallProductSnapshotImage";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductImage";
import type { IShoppingMallProductReviewStatistic } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductReviewStatistic";
import type { IShoppingMallProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductSnapshot";
import type { IShoppingMallProductSnapshotImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductSnapshotImage";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import type { IShoppingMallProductVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariantOption";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
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
import { generate_random_shopping_mall_seller_products_create } from "../../../generate/generate_random_shopping_mall_seller_products_create";
import { generate_random_shopping_mall_seller_products_images_create } from "../../../generate/generate_random_shopping_mall_seller_products_images_create";
import { prepare_random_shopping_mall_product } from "../../../prepare/prepare_random_shopping_mall_product";
import { prepare_random_shopping_mall_product_image } from "../../../prepare/prepare_random_shopping_mall_product_image";

/**
 * Test administrator retrieval of a specific product snapshot image.
 *
 * This test verifies the complete workflow:
 * 1. Admin registration and login
 * 2. Seller registration
 * 3. Seller creates product with images (utility handles category creation)
 * 4. Seller uploads additional images to product
 * 5. Seller edits product (creates snapshot)
 * 6. Admin retrieves snapshot list to get snapshotId
 * 7. Admin retrieves snapshot images list to get imageId
 * 8. Admin retrieves specific snapshot image by imageId
 * 9. Validate response contains all required fields and snapshot data
 */
export async function test_api_product_snapshot_image_retrieval_by_admin(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin setup - register and login
  const adminPassword = RandomGenerator.alphaNumeric(16);
  const adminConnection: api.IConnection = { host: connection.host };
  const adminCredentials = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: adminPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IShoppingMallAdmin.IJoin,
  });
  typia.assert(adminCredentials);
  const adminLoginConnection: api.IConnection = { host: connection.host };
  await authorize_admin_login(adminLoginConnection, {
    body: {
      email: adminCredentials.email,
      password: adminPassword,
    } satisfies IShoppingMallAdmin.ILogin,
  });
  // 2. Seller setup - register
  const sellerPassword = RandomGenerator.alphaNumeric(16);
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerCredentials = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: sellerPassword,
      shop_name: RandomGenerator.name(),
      shop_description: RandomGenerator.paragraph({ sentences: 2 }),
    } satisfies IShoppingMallSeller.IJoin,
  });
  typia.assert(sellerCredentials);
  // 3. Seller login for product operations
  const sellerLoginConnection: api.IConnection = { host: connection.host };
  await authorize_seller_login(sellerLoginConnection, {
    body: {
      email: sellerCredentials.email,
      password: sellerPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IShoppingMallSeller.ILogin,
  });
  // 4. Seller creates product (utility handles category creation internally)
  const product = await generate_random_shopping_mall_seller_products_create(
    sellerLoginConnection,
    {},
  );
  typia.assert(product);
  // 5. Seller uploads additional images to product
  const imageCount = 3;
  const images: IShoppingMallProductImage[] = [];
  for (let i = 0; i < imageCount; i++) {
    const image =
      await generate_random_shopping_mall_seller_products_images_create(
        sellerLoginConnection,
        {
          params: { productId: product.id },
          body: {
            image_url: typia.random<string & tags.Format<"uri">>(),
            display_order: i,
          } satisfies IShoppingMallProductImage.ICreate,
        },
      );
    typia.assert(image);
    images.push(image);
  }
  TestValidator.equals("uploaded image count", images.length, imageCount);
  // 6. Seller edits product to create snapshot
  const updatedProduct =
    await api.functional.shoppingMall.seller.products.update(
      sellerLoginConnection,
      {
        productId: product.id,
        body: {
          name: RandomGenerator.paragraph({ sentences: 3 }),
          basePrice: product.base_price + 1000,
        } satisfies IShoppingMallProduct.IUpdate,
      },
    );
  typia.assert(updatedProduct);
  TestValidator.notEquals(
    "product name modified",
    updatedProduct.name,
    product.name,
  );
  // 7. Admin retrieves product snapshots list
  const snapshotsResponse =
    await api.functional.shoppingMall.admin.products.snapshots.index(
      adminLoginConnection,
      {
        productId: product.id,
        body: {
          page: 1,
          limit: 10,
          sort: "snapshot_at,desc",
        } satisfies IShoppingMallProductSnapshot.IRequest,
      },
    );
  typia.assert(snapshotsResponse);
  TestValidator.predicate("snapshots exist", snapshotsResponse.data.length > 0);
  const snapshot = snapshotsResponse.data[0];
  const snapshotId = snapshot.id;
  // 8. Admin retrieves snapshot images list
  const imagesResponse =
    await api.functional.shoppingMall.admin.products.snapshots.images.index(
      adminLoginConnection,
      {
        productId: product.id,
        snapshotId: snapshotId,
        body: {
          page: 1,
          limit: 10,
          sort: "display_order,asc",
        } satisfies IShoppingMallProductSnapshotImage.IRequest,
      },
    );
  typia.assert(imagesResponse);
  TestValidator.predicate(
    "snapshot images exist",
    imagesResponse.data.length > 0,
  );
  const snapshotImage = imagesResponse.data[0];
  const imageId = snapshotImage.id;
  // 9. Admin retrieves specific snapshot image
  const retrievedImage =
    await api.functional.shoppingMall.admin.products.snapshots.images.at(
      adminLoginConnection,
      {
        productId: product.id,
        snapshotId: snapshotId,
        imageId: imageId,
      },
    );
  typia.assert(retrievedImage);
  // 10. Validate response structure and data integrity
  TestValidator.equals(
    "snapshot id matches",
    retrievedImage.shopping_mall_product_snapshot_id,
    snapshotId,
  );
  TestValidator.equals(
    "image id matches list",
    retrievedImage.id,
    snapshotImage.id,
  );
  TestValidator.equals(
    "image url matches list",
    retrievedImage.image_url,
    snapshotImage.image_url,
  );
  TestValidator.equals(
    "display order matches list",
    retrievedImage.display_order,
    snapshotImage.display_order,
  );
  // Validate nested snapshot information exists
  TestValidator.predicate(
    "snapshot name exists",
    retrievedImage.snapshot.name !== undefined,
  );
  TestValidator.predicate(
    "snapshot base price exists",
    retrievedImage.snapshot.base_price !== undefined,
  );
  TestValidator.predicate(
    "snapshot category exists",
    retrievedImage.snapshot.category !== undefined,
  );
  TestValidator.predicate(
    "snapshot seller exists",
    retrievedImage.snapshot.seller !== undefined,
  );
}
