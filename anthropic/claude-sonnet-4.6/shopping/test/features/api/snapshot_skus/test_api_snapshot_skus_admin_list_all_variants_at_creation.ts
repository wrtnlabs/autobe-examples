import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallProductSnapshot";
import type { IPageIShoppingMallProductSnapshotSkus } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallProductSnapshotSkus";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminOfCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminOfCustomer";
import type { IShoppingMallAdminOfSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminOfSeller";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductImage";
import type { IShoppingMallProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductSnapshot";
import type { IShoppingMallProductSnapshotSkus } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductSnapshotSkus";
import type { IShoppingMallProductSnapshotSkusOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductSnapshotSkusOption";
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

export async function test_api_snapshot_skus_admin_list_all_variants_at_creation(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin Setup
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {});
  // 2. Create a product category
  const category = await generate_random_shopping_mall_admin_categories_create(
    adminConnection,
    {},
  );
  typia.assert(category);
  // 3. Seller Setup
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {});
  typia.assert(sellerAuth);
  const sellerId = sellerAuth.id;
  // 4. Seller submits approval request
  const approval = await generate_random_shopping_mall_seller_approvals_create(
    sellerConnection,
    { body: {} },
  );
  typia.assert(approval);
  // 5. Admin approves the seller
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
  // 6. Seller creates a product with 2 variants (distinct SKU codes, price overrides, options)
  const basePrice = 10000;
  const variant1Sku = `SKU-${RandomGenerator.alphaNumeric(8)}-A`;
  const variant2Sku = `SKU-${RandomGenerator.alphaNumeric(8)}-B`;
  const variant1PriceOverride = 12000;
  const variant2PriceOverride = 15000;
  const product = await generate_random_shopping_mall_seller_products_create(
    sellerConnection,
    {
      body: {
        name: RandomGenerator.paragraph({ sentences: 2 }),
        description: RandomGenerator.paragraph({ sentences: 3 }),
        base_price: basePrice,
        categoryId: category.id,
        images: [
          {
            urls: [typia.random<string & tags.Format<"url">>()],
          },
        ],
        variants: [
          {
            sku: variant1Sku,
            priceOverride: variant1PriceOverride,
            options: [
              {
                id: typia.random<string & tags.Format<"uuid">>(),
                product_variant_id: typia.random<
                  string & tags.Format<"uuid">
                >(),
                key: "color",
                value: "red",
                sequence: 0,
                created_at: new Date().toISOString(),
              },
              {
                id: typia.random<string & tags.Format<"uuid">>(),
                product_variant_id: typia.random<
                  string & tags.Format<"uuid">
                >(),
                key: "size",
                value: "M",
                sequence: 1,
                created_at: new Date().toISOString(),
              },
            ],
          },
          {
            sku: variant2Sku,
            priceOverride: variant2PriceOverride,
            options: [
              {
                id: typia.random<string & tags.Format<"uuid">>(),
                product_variant_id: typia.random<
                  string & tags.Format<"uuid">
                >(),
                key: "color",
                value: "blue",
                sequence: 0,
                created_at: new Date().toISOString(),
              },
              {
                id: typia.random<string & tags.Format<"uuid">>(),
                product_variant_id: typia.random<
                  string & tags.Format<"uuid">
                >(),
                key: "size",
                value: "L",
                sequence: 1,
                created_at: new Date().toISOString(),
              },
            ],
          },
        ],
      },
    },
  );
  typia.assert(product);
  // 7. Admin retrieves the product's snapshot list to get the snapshotId
  const snapshotsPage =
    await api.functional.shoppingMall.admin.sellers.products.snapshots.index(
      adminConnection,
      {
        sellerId: sellerId,
        productId: product.id,
        body: {},
      },
    );
  typia.assert(snapshotsPage);
  TestValidator.predicate(
    "at least one snapshot exists",
    snapshotsPage.data.length > 0,
  );
  const snapshotId = snapshotsPage.data[0]!.id;
  // 8. Admin calls target operation: list all snapshot SKUs with no filters
  const skusPage =
    await api.functional.shoppingMall.admin.snapshots.skuses.index(
      adminConnection,
      {
        snapshotId: snapshotId,
        body: {},
      },
    );
  typia.assert(skusPage);
  // Validate pagination
  TestValidator.predicate(
    "pagination records equals variant count",
    skusPage.pagination.records === 2,
  );
  TestValidator.predicate(
    "data array length equals variant count",
    skusPage.data.length === 2,
  );
  // Validate each SKU entry
  const skuCodes = skusPage.data.map((sku) => sku.skuCode);
  TestValidator.predicate(
    "first variant SKU code exists",
    skuCodes.includes(variant1Sku),
  );
  TestValidator.predicate(
    "second variant SKU code exists",
    skuCodes.includes(variant2Sku),
  );
  // Validate prices reflect priceOverride values
  for (const sku of skusPage.data) {
    if (sku.skuCode === variant1Sku) {
      TestValidator.equals(
        "variant1 price override",
        sku.price,
        variant1PriceOverride,
      );
    } else if (sku.skuCode === variant2Sku) {
      TestValidator.equals(
        "variant2 price override",
        sku.price,
        variant2PriceOverride,
      );
    }
  }
  // Validate options are ordered by sequence ascending for each SKU
  for (const sku of skusPage.data) {
    TestValidator.predicate(
      `SKU ${sku.skuCode} options exist`,
      sku.options.length > 0,
    );
    for (let i = 1; i < sku.options.length; i++) {
      TestValidator.predicate(
        `SKU ${sku.skuCode} options ordered by sequence`,
        sku.options[i]!.sequence >= sku.options[i - 1]!.sequence,
      );
    }
  }
  // 9. Idempotency: second call returns identical results
  const skusPage2 =
    await api.functional.shoppingMall.admin.snapshots.skuses.index(
      adminConnection,
      {
        snapshotId: snapshotId,
        body: {},
      },
    );
  typia.assert(skusPage2);
  TestValidator.equals(
    "repeated call returns same pagination",
    skusPage.pagination,
    skusPage2.pagination,
  );
  TestValidator.equals(
    "repeated call returns same records count",
    skusPage.data.length,
    skusPage2.data.length,
  );
}
