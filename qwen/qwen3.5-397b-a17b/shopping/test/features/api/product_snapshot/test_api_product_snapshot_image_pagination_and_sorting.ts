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
 * Test pagination and sorting functionality for product snapshot image retrieval.
 *
 * This test validates:
 * 1. Admin and seller authentication workflow
 * 2. Seller approval by admin
 * 3. Product creation with multiple images
 * 4. Product edit to create snapshots
 * 5. Snapshot image retrieval with pagination
 * 6. Sorting by display_order and created_at
 * 7. Edge cases for pagination beyond available pages
 */
export async function test_api_product_snapshot_image_pagination_and_sorting(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin setup - join and login
  const adminPassword = RandomGenerator.alphaNumeric(16);
  const adminEmail = typia.random<string & tags.Format<"email">>();
  await authorize_admin_join(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IShoppingMallAdmin.IJoin,
  });
  const adminConnection: api.IConnection = { host: connection.host };
  const adminLogin = await authorize_admin_login(adminConnection, {
    body: {
      email: adminEmail,
      password: adminPassword,
    } satisfies IShoppingMallAdmin.ILogin,
  });
  typia.assert(adminLogin);
  // 2. Seller setup - join and login
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const sellerPassword = RandomGenerator.alphaNumeric(16);
  const sellerJoin = await authorize_seller_join(connection, {
    body: {
      email: sellerEmail,
      password: sellerPassword,
      shop_name: RandomGenerator.name(),
      shop_description: RandomGenerator.paragraph({ sentences: 2 }),
      logo_image_url: typia.random<string & tags.Format<"uri">>(),
    } satisfies IShoppingMallSeller.IJoin,
  });
  typia.assert(sellerJoin);
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerLogin = await authorize_seller_login(sellerConnection, {
    body: {
      email: sellerEmail,
      password: sellerPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IShoppingMallSeller.ILogin,
  });
  typia.assert(sellerLogin);
  // 3. Admin approves seller registration
  const approvedSeller =
    await api.functional.shoppingMall.admin.sellers.approve(adminConnection, {
      sellerId: sellerJoin.id,
    });
  typia.assert(approvedSeller);
  TestValidator.equals(
    "seller approval status",
    approvedSeller.approval_status,
    "APPROVED",
  );
  // 4. Seller creates product
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
  // 5. Seller uploads multiple images to product (create 8 images for pagination testing)
  const imageUrls: string[] = [];
  for (let i = 0; i < 8; i++) {
    const image =
      await api.functional.shoppingMall.seller.products.images.create(
        sellerConnection,
        {
          productId: product.id,
          body: {
            image_url: typia.random<string & tags.Format<"uri">>(),
            display_order: i,
          } satisfies IShoppingMallProductImage.ICreate,
        },
      );
    typia.assert(image);
    imageUrls.push(image.image_url);
  }
  // 6. Seller edits product to create first snapshot
  const updatedProduct1 =
    await api.functional.shoppingMall.seller.products.update(sellerConnection, {
      productId: product.id,
      body: {
        name: `${product.name} - Updated v1`,
      } satisfies IShoppingMallProduct.IUpdate,
    });
  typia.assert(updatedProduct1);
  // 7. Add more images and edit again to create second snapshot
  for (let i = 8; i < 12; i++) {
    const image =
      await api.functional.shoppingMall.seller.products.images.create(
        sellerConnection,
        {
          productId: product.id,
          body: {
            image_url: typia.random<string & tags.Format<"uri">>(),
            display_order: i,
          } satisfies IShoppingMallProductImage.ICreate,
        },
      );
    typia.assert(image);
  }
  const updatedProduct2 =
    await api.functional.shoppingMall.seller.products.update(sellerConnection, {
      productId: product.id,
      body: {
        name: `${product.name} - Updated v2`,
      } satisfies IShoppingMallProduct.IUpdate,
    });
  typia.assert(updatedProduct2);
  // 8. Admin retrieves product snapshots to find snapshot IDs
  const snapshotsPage1 =
    await api.functional.shoppingMall.admin.products.snapshots.index(
      adminConnection,
      {
        productId: product.id,
        body: {
          page: 1,
          limit: 20,
          sort: "snapshot_at,desc",
        } satisfies IShoppingMallProductSnapshot.IRequest,
      },
    );
  typia.assert(snapshotsPage1);
  TestValidator.predicate("snapshots exist", snapshotsPage1.data.length >= 2);
  // Get the most recent snapshot for testing
  const targetSnapshot = snapshotsPage1.data[0];
  TestValidator.predicate(
    "snapshot has valid id",
    targetSnapshot.id !== undefined,
  );
  // 9. Test default pagination (page 1, limit 20)
  const defaultPagination =
    await api.functional.shoppingMall.admin.products.snapshots.images.index(
      adminConnection,
      {
        productId: product.id,
        snapshotId: targetSnapshot.id,
        body: {
          page: 1,
          limit: 20,
        } satisfies IShoppingMallProductSnapshotImage.IRequest,
      },
    );
  typia.assert(defaultPagination);
  // Verify pagination metadata
  TestValidator.equals("current page", defaultPagination.pagination.current, 1);
  TestValidator.equals("limit", defaultPagination.pagination.limit, 20);
  TestValidator.predicate(
    "total records > 0",
    defaultPagination.pagination.records > 0,
  );
  TestValidator.predicate(
    "total pages >= 1",
    defaultPagination.pagination.pages >= 1,
  );
  // 10. Test pagination page 2 with limit 5
  const page2Limit5 =
    await api.functional.shoppingMall.admin.products.snapshots.images.index(
      adminConnection,
      {
        productId: product.id,
        snapshotId: targetSnapshot.id,
        body: {
          page: 2,
          limit: 5,
        } satisfies IShoppingMallProductSnapshotImage.IRequest,
      },
    );
  typia.assert(page2Limit5);
  TestValidator.equals("page 2 current", page2Limit5.pagination.current, 2);
  TestValidator.equals("page 2 limit", page2Limit5.pagination.limit, 5);
  // 11. Test sorting by display_order ascending (default)
  const sortDisplayOrderAsc =
    await api.functional.shoppingMall.admin.products.snapshots.images.index(
      adminConnection,
      {
        productId: product.id,
        snapshotId: targetSnapshot.id,
        body: {
          page: 1,
          limit: 20,
          sort: "display_order,asc",
        } satisfies IShoppingMallProductSnapshotImage.IRequest,
      },
    );
  typia.assert(sortDisplayOrderAsc);
  // Verify ascending order
  if (sortDisplayOrderAsc.data.length > 1) {
    for (let i = 1; i < sortDisplayOrderAsc.data.length; i++) {
      TestValidator.predicate(
        `display_order ascending at index ${i}`,
        sortDisplayOrderAsc.data[i].display_order >=
          sortDisplayOrderAsc.data[i - 1].display_order,
      );
    }
  }
  // 12. Test sorting by display_order descending
  const sortDisplayOrderDesc =
    await api.functional.shoppingMall.admin.products.snapshots.images.index(
      adminConnection,
      {
        productId: product.id,
        snapshotId: targetSnapshot.id,
        body: {
          page: 1,
          limit: 20,
          sort: "display_order,desc",
        } satisfies IShoppingMallProductSnapshotImage.IRequest,
      },
    );
  typia.assert(sortDisplayOrderDesc);
  // Verify descending order
  if (sortDisplayOrderDesc.data.length > 1) {
    for (let i = 1; i < sortDisplayOrderDesc.data.length; i++) {
      TestValidator.predicate(
        `display_order descending at index ${i}`,
        sortDisplayOrderDesc.data[i].display_order <=
          sortDisplayOrderDesc.data[i - 1].display_order,
      );
    }
  }
  // 13. Test sorting by created_at ascending
  const sortCreatedAtAsc =
    await api.functional.shoppingMall.admin.products.snapshots.images.index(
      adminConnection,
      {
        productId: product.id,
        snapshotId: targetSnapshot.id,
        body: {
          page: 1,
          limit: 20,
          sort: "created_at,asc",
        } satisfies IShoppingMallProductSnapshotImage.IRequest,
      },
    );
  typia.assert(sortCreatedAtAsc);
  // Verify ascending order by created_at
  if (sortCreatedAtAsc.data.length > 1) {
    for (let i = 1; i < sortCreatedAtAsc.data.length; i++) {
      TestValidator.predicate(
        `created_at ascending at index ${i}`,
        new Date(sortCreatedAtAsc.data[i].created_at).getTime() >=
          new Date(sortCreatedAtAsc.data[i - 1].created_at).getTime(),
      );
    }
  }
  // 14. Test sorting by created_at descending
  const sortCreatedAtDesc =
    await api.functional.shoppingMall.admin.products.snapshots.images.index(
      adminConnection,
      {
        productId: product.id,
        snapshotId: targetSnapshot.id,
        body: {
          page: 1,
          limit: 20,
          sort: "created_at,desc",
        } satisfies IShoppingMallProductSnapshotImage.IRequest,
      },
    );
  typia.assert(sortCreatedAtDesc);
  // Verify descending order by created_at
  if (sortCreatedAtDesc.data.length > 1) {
    for (let i = 1; i < sortCreatedAtDesc.data.length; i++) {
      TestValidator.predicate(
        `created_at descending at index ${i}`,
        new Date(sortCreatedAtDesc.data[i].created_at).getTime() <=
          new Date(sortCreatedAtDesc.data[i - 1].created_at).getTime(),
      );
    }
  }
  // 15. Test edge case: request page beyond available pages
  const beyondPages =
    await api.functional.shoppingMall.admin.products.snapshots.images.index(
      adminConnection,
      {
        productId: product.id,
        snapshotId: targetSnapshot.id,
        body: {
          page: 9999,
          limit: 5,
        } satisfies IShoppingMallProductSnapshotImage.IRequest,
      },
    );
  typia.assert(beyondPages);
  TestValidator.equals(
    "beyond pages returns empty array",
    beyondPages.data.length,
    0,
  );
  TestValidator.predicate(
    "beyond pages has valid pagination metadata",
    beyondPages.pagination.current > 0,
  );
}
