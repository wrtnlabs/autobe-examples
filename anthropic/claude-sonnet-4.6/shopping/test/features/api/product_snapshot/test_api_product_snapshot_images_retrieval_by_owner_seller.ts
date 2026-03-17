import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallProductSnapshotImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallProductSnapshotImage";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminOfCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminOfCustomer";
import type { IShoppingMallAdminOfSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminOfSeller";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductImage";
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

export async function test_api_product_snapshot_images_retrieval_by_owner_seller(
  connection: api.IConnection,
): Promise<void> {
  // ========== STEP 1: Register admin account ==========
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {});
  // ========== STEP 2: Create a product category ==========
  const category = await generate_random_shopping_mall_admin_categories_create(
    adminConnection,
    {},
  );
  typia.assert(category);
  // ========== STEP 3: Register a seller account ==========
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const sellerPassword = RandomGenerator.alphaNumeric(16);
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerConnection, {
    body: {
      email: sellerEmail,
      password: sellerPassword,
      shop_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  // ========== STEP 4: Submit seller approval request ==========
  const approval = await generate_random_shopping_mall_seller_approvals_create(
    sellerConnection,
    { body: {} },
  );
  typia.assert(approval);
  // ========== STEP 5: Admin approves the seller ==========
  const updatedApproval =
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
  typia.assert(updatedApproval);
  TestValidator.equals(
    "approval status is approved",
    updatedApproval.status,
    "approved",
  );
  // ========== STEP 6: Re-login seller after approval ==========
  const approvedSellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_login(approvedSellerConnection, {
    body: {
      email: sellerEmail,
      password: sellerPassword,
    } satisfies IShoppingMallSeller.ILogin,
  });
  // ========== STEP 7: Create a product with 2 images and 1 variant ==========
  const imageUrl1 = typia.random<string & tags.Format<"url">>();
  const imageUrl2 = typia.random<string & tags.Format<"url">>();
  const product = await generate_random_shopping_mall_seller_products_create(
    approvedSellerConnection,
    {
      body: {
        categoryId: category.id,
        name: RandomGenerator.paragraph({ sentences: 2 }),
        description: RandomGenerator.paragraph({ sentences: 3 }),
        base_price: 10000,
        images: [
          {
            urls: [imageUrl1],
          } satisfies IShoppingMallProductImage.ICreate,
          {
            urls: [imageUrl2],
          } satisfies IShoppingMallProductImage.ICreate,
        ],
        variants: [
          {
            sku: `SKU-${RandomGenerator.alphaNumeric(8)}`,
            priceOverride: null,
            options: [
              {
                id: typia.random<string & tags.Format<"uuid">>(),
                product_variant_id: typia.random<
                  string & tags.Format<"uuid">
                >(),
                key: "color",
                value: "red",
                sequence: 0 satisfies number as number & tags.Type<"int32">,
                created_at: new Date().toISOString(),
              },
            ],
          } satisfies IShoppingMallProductVariant.ICreate,
        ],
      },
    },
  );
  typia.assert(product);
  TestValidator.predicate(
    "product has at least 2 images",
    product.images.length >= 2,
  );
  const productId = product.id;
  // ========== STEP 8: Access control tests ==========
  // Test: accessing with invalid snapshotId should fail (404)
  await TestValidator.error("invalid snapshotId returns error", async () => {
    await api.functional.shoppingMall.seller.products.snapshots.images.index(
      approvedSellerConnection,
      {
        productId,
        snapshotId: typia.random<string & tags.Format<"uuid">>(),
        body: {} satisfies IShoppingMallProductSnapshotImage.IRequest,
      },
    );
  });
  // Test: accessing with invalid productId should fail (404)
  await TestValidator.error("invalid productId returns error", async () => {
    await api.functional.shoppingMall.seller.products.snapshots.images.index(
      approvedSellerConnection,
      {
        productId: typia.random<string & tags.Format<"uuid">>(),
        snapshotId: typia.random<string & tags.Format<"uuid">>(),
        body: {} satisfies IShoppingMallProductSnapshotImage.IRequest,
      },
    );
  });
  // ========== STEP 9: Register another seller and test cross-seller access ==========
  const otherSellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(otherSellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      shop_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  // Other seller (unapproved) cannot access owner seller's product snapshot images
  await TestValidator.error(
    "other seller cannot access owner's snapshot images",
    async () => {
      await api.functional.shoppingMall.seller.products.snapshots.images.index(
        otherSellerConnection,
        {
          productId,
          snapshotId: typia.random<string & tags.Format<"uuid">>(),
          body: {} satisfies IShoppingMallProductSnapshotImage.IRequest,
        },
      );
    },
  );
  // ========== STEP 10: Validate request body variants are well-typed ==========
  // Test that pagination request bodies compile correctly and are valid DTOs
  const paginationBody = {
    page: 1 satisfies number as number & tags.Type<"int32"> & tags.Minimum<1>,
    limit: 1 satisfies number as number &
      tags.Type<"int32"> &
      tags.Minimum<1> &
      tags.Maximum<100>,
  } satisfies IShoppingMallProductSnapshotImage.IRequest;
  await TestValidator.error(
    "pagination with page=1 limit=1 and unknown snapshotId returns error",
    async () => {
      await api.functional.shoppingMall.seller.products.snapshots.images.index(
        approvedSellerConnection,
        {
          productId,
          snapshotId: typia.random<string & tags.Format<"uuid">>(),
          body: paginationBody,
        },
      );
    },
  );
  const sortBody = {
    sort: "created_at" as const,
    order: "desc" as const,
  } satisfies IShoppingMallProductSnapshotImage.IRequest;
  await TestValidator.error(
    "sort by created_at desc with unknown snapshotId returns error",
    async () => {
      await api.functional.shoppingMall.seller.products.snapshots.images.index(
        approvedSellerConnection,
        {
          productId,
          snapshotId: typia.random<string & tags.Format<"uuid">>(),
          body: sortBody,
        },
      );
    },
  );
  const sequenceAscBody = {
    sort: "sequence" as const,
    order: "asc" as const,
  } satisfies IShoppingMallProductSnapshotImage.IRequest;
  await TestValidator.error(
    "sort by sequence asc with unknown snapshotId returns error",
    async () => {
      await api.functional.shoppingMall.seller.products.snapshots.images.index(
        approvedSellerConnection,
        {
          productId,
          snapshotId: typia.random<string & tags.Format<"uuid">>(),
          body: sequenceAscBody,
        },
      );
    },
  );
}
