import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallProductSnapshot";
import type { IPageIShoppingMallProductSnapshotSkus } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallProductSnapshotSkus";
import type { IPageIShoppingMallProductSnapshotSkusOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallProductSnapshotSkusOption";
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

export async function test_api_product_snapshot_sku_options_list_by_seller(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin join
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {});
  // 2. Create category (admin)
  const category = await generate_random_shopping_mall_admin_categories_create(
    adminConnection,
    {
      body: {
        name: `Electronics-${RandomGenerator.alphaNumeric(6)}`,
        description: "Electronic goods",
      },
    },
  );
  typia.assert(category);
  // 3. Seller join
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      shop_name: `Shop-${RandomGenerator.alphaNumeric(6)}`,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  // 4. Submit seller approval request
  const approval = await generate_random_shopping_mall_seller_approvals_create(
    sellerConnection,
    {},
  );
  typia.assert(approval);
  // 5. Admin approves the seller
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
  // 6. Seller creates a product with one variant having two options (color=red, size=XL)
  const skuCode = `SKU-${RandomGenerator.alphaNumeric(10)}`;
  const product = await generate_random_shopping_mall_seller_products_create(
    sellerConnection,
    {
      body: {
        name: `Test Product ${RandomGenerator.alphaNumeric(6)}`,
        description: "A test product with color and size options",
        base_price: 9900,
        categoryId: category.id,
        variants: [
          {
            sku: skuCode,
            priceOverride: null,
            options: [
              { key: "color", value: "red" },
              { key: "size", value: "XL" },
            ],
          },
        ],
      },
    },
  );
  typia.assert(product);
  // 7. List the product's snapshots to get the snapshotId
  const snapshotPage =
    await api.functional.shoppingMall.seller.products.snapshots.index(
      sellerConnection,
      {
        productId: product.id,
        body: {},
      },
    );
  typia.assert(snapshotPage);
  TestValidator.predicate("snapshot exists", snapshotPage.data.length > 0);
  const snapshot = snapshotPage.data[0]!;
  // 8. List snapshot SKU records to get the skuId
  const skuPage =
    await api.functional.shoppingMall.seller.products.snapshots.skuses.index(
      sellerConnection,
      {
        productId: product.id,
        snapshotId: snapshot.id,
        body: {},
      },
    );
  typia.assert(skuPage);
  TestValidator.predicate("sku exists", skuPage.data.length > 0);
  const sku = skuPage.data[0]!;
  // 9. Retrieve options for the snapshot SKU (target endpoint)
  const optionsPage =
    await api.functional.shoppingMall.seller.products.snapshots.skuses.options.index(
      sellerConnection,
      {
        productId: product.id,
        snapshotId: snapshot.id,
        skuId: sku.id,
        body: {},
      },
    );
  typia.assert(optionsPage);
  // Assertions on pagination
  TestValidator.equals("pagination current", optionsPage.pagination.current, 1);
  TestValidator.predicate(
    "pagination records >= 2",
    optionsPage.pagination.records >= 2,
  );
  TestValidator.predicate(
    "pagination pages >= 1",
    optionsPage.pagination.pages >= 1,
  );
  TestValidator.predicate(
    "pagination limit > 0",
    optionsPage.pagination.limit > 0,
  );
  // Assertions on data array
  TestValidator.predicate(
    "data has at least 2 options",
    optionsPage.data.length >= 2,
  );
  // Each option must have product_snapshot_skus_id matching skuId, non-negative sequence, non-empty key/value
  for (const option of optionsPage.data) {
    TestValidator.equals(
      "option product_snapshot_skus_id matches skuId",
      option.product_snapshot_skus_id,
      sku.id,
    );
    TestValidator.predicate(
      "option sequence is non-negative",
      option.sequence >= 0,
    );
    TestValidator.predicate("option key is non-empty", option.key.length > 0);
    TestValidator.predicate(
      "option value is non-empty",
      option.value.length > 0,
    );
  }
  // Options must be ordered by sequence ASC
  for (let i = 1; i < optionsPage.data.length; i++) {
    TestValidator.predicate(
      "options ordered by sequence ASC",
      optionsPage.data[i]!.sequence >= optionsPage.data[i - 1]!.sequence,
    );
  }
  // Verify key-value pairs match creation payload (immutability check)
  const colorOption = optionsPage.data.find((o) => o.key === "color");
  const sizeOption = optionsPage.data.find((o) => o.key === "size");
  TestValidator.predicate("color option exists", colorOption !== undefined);
  TestValidator.predicate("size option exists", sizeOption !== undefined);
  TestValidator.equals("color value matches", colorOption!.value, "red");
  TestValidator.equals("size value matches", sizeOption!.value, "XL");
}
