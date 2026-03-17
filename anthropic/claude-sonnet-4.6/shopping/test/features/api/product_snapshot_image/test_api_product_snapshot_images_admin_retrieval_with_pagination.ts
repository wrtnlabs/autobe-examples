import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallProductSnapshot";
import type { IPageIShoppingMallProductSnapshotImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallProductSnapshotImage";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminOfCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminOfCustomer";
import type { IShoppingMallAdminOfSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminOfSeller";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductImage";
import type { IShoppingMallProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductSnapshot";
import type { IShoppingMallProductSnapshotImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductSnapshotImage";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import type { IShoppingMallProductVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariantOption";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerApproval } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerApproval";
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
import { generate_random_shopping_mall_seller_approvals_create } from "../../../generate/generate_random_shopping_mall_seller_approvals_create";
import { generate_random_shopping_mall_seller_products_create } from "../../../generate/generate_random_shopping_mall_seller_products_create";
import { prepare_random_shopping_mall_category } from "../../../prepare/prepare_random_shopping_mall_category";
import { prepare_random_shopping_mall_product } from "../../../prepare/prepare_random_shopping_mall_product";
import { prepare_random_shopping_mall_product_image } from "../../../prepare/prepare_random_shopping_mall_product_image";
import { prepare_random_shopping_mall_product_variant } from "../../../prepare/prepare_random_shopping_mall_product_variant";
import { prepare_random_shopping_mall_seller_approval } from "../../../prepare/prepare_random_shopping_mall_seller_approval";

export async function test_api_product_snapshot_images_admin_retrieval_with_pagination(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register admin
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {});
  // 2. Register seller
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const sellerPassword = RandomGenerator.alphaNumeric(16);
  await authorize_seller_join(sellerConnection, {
    body: {
      email: sellerEmail,
      password: sellerPassword,
    },
  });
  // 3. Seller submits approval request
  const approval = await generate_random_shopping_mall_seller_approvals_create(
    sellerConnection,
    { body: {} },
  );
  typia.assert(approval);
  // 4. Admin approves the seller
  const approvedApproval =
    await api.functional.shoppingMall.admin.sellerApprovals.update(
      adminConnection,
      {
        approvalId: approval.id,
        body: {
          status: "approved",
          rejection_reason: null,
        } satisfies IShoppingMallSellerApproval.IUpdate,
      },
    );
  typia.assert(approvedApproval);
  // 5. Admin creates a product category
  const category = await generate_random_shopping_mall_admin_categories_create(
    adminConnection,
    { body: {} },
  );
  typia.assert(category);
  // 6. Seller creates a product with 3 images (generates a snapshot automatically)
  const imageUrls = [
    "https://example.com/image1.jpg",
    "https://example.com/image2.jpg",
    "https://example.com/image3.jpg",
  ] as const;
  const product = await generate_random_shopping_mall_seller_products_create(
    sellerConnection,
    {
      body: {
        categoryId: category.id,
        images: [
          { urls: [imageUrls[0]] } satisfies IShoppingMallProductImage.ICreate,
          { urls: [imageUrls[1]] } satisfies IShoppingMallProductImage.ICreate,
          { urls: [imageUrls[2]] } satisfies IShoppingMallProductImage.ICreate,
        ],
      },
    },
  );
  typia.assert(product);
  // 7. Admin retrieves snapshot list to get snapshotId
  const snapshotPage =
    await api.functional.shoppingMall.admin.sellers.products.snapshots.index(
      adminConnection,
      {
        sellerId: product.seller.id,
        productId: product.id,
        body: {} satisfies IShoppingMallProductSnapshot.IRequest,
      },
    );
  typia.assert(snapshotPage);
  TestValidator.predicate(
    "snapshot list has at least one item",
    snapshotPage.data.length > 0,
  );
  const snapshotId = snapshotPage.data[0]!.id;
  // --- Primary Test: default pagination ---
  const defaultPage =
    await api.functional.shoppingMall.admin.snapshots.images.index(
      adminConnection,
      {
        snapshotId,
        body: {} satisfies IShoppingMallProductSnapshotImage.IRequest,
      },
    );
  typia.assert(defaultPage);
  TestValidator.equals(
    "total records equals image count",
    defaultPage.pagination.records,
    3,
  );
  TestValidator.equals(
    "data array length equals image count",
    defaultPage.data.length,
    3,
  );
  // Assert each image has matching product_snapshot_id
  for (const img of defaultPage.data) {
    TestValidator.equals(
      "product_snapshot_id matches",
      img.product_snapshot_id,
      snapshotId,
    );
  }
  // Assert images are ordered by sequence ascending
  for (let i = 0; i < defaultPage.data.length - 1; i++) {
    TestValidator.predicate(
      `sequence ascending: item ${i} <= item ${i + 1}`,
      defaultPage.data[i]!.sequence <= defaultPage.data[i + 1]!.sequence,
    );
  }
  // Assert URL values match what was provided during product creation
  const returnedUrls = defaultPage.data.map((img) => img.url);
  for (const url of imageUrls) {
    TestValidator.predicate(
      `url ${url} is present in snapshot images`,
      returnedUrls.some((u) => u === url),
    );
  }
  // --- Pagination Edge Case: limit=1, page=1 ---
  const page1 = await api.functional.shoppingMall.admin.snapshots.images.index(
    adminConnection,
    {
      snapshotId,
      body: {
        page: 1,
        limit: 1,
      } satisfies IShoppingMallProductSnapshotImage.IRequest,
    },
  );
  typia.assert(page1);
  TestValidator.equals("page1 data has exactly 1 item", page1.data.length, 1);
  TestValidator.equals(
    "pages equals total image count",
    page1.pagination.pages,
    3,
  );
  // --- Pagination Edge Case: limit=1, page=2 ---
  const page2 = await api.functional.shoppingMall.admin.snapshots.images.index(
    adminConnection,
    {
      snapshotId,
      body: {
        page: 2,
        limit: 1,
      } satisfies IShoppingMallProductSnapshotImage.IRequest,
    },
  );
  typia.assert(page2);
  TestValidator.equals("page2 data has exactly 1 item", page2.data.length, 1);
  // The second page item should have a higher sequence than the first page item
  TestValidator.predicate(
    "page2 image has higher sequence than page1 image",
    page2.data[0]!.sequence >= page1.data[0]!.sequence,
  );
  // --- Sort Direction Test: desc ---
  const descPage =
    await api.functional.shoppingMall.admin.snapshots.images.index(
      adminConnection,
      {
        snapshotId,
        body: {
          sort: "sequence",
          order: "desc",
        } satisfies IShoppingMallProductSnapshotImage.IRequest,
      },
    );
  typia.assert(descPage);
  // Assert images are ordered by sequence descending
  for (let i = 0; i < descPage.data.length - 1; i++) {
    TestValidator.predicate(
      `desc sequence: item ${i} >= item ${i + 1}`,
      descPage.data[i]!.sequence >= descPage.data[i + 1]!.sequence,
    );
  }
}
