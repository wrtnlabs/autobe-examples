import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminOfCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminOfCustomer";
import type { IShoppingMallAdminOfSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminOfSeller";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductImage";
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

export async function test_api_product_snapshot_sku_admin_retrieval(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Register admin account
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {});
  // Step 2: Admin creates a product category
  const category = await generate_random_shopping_mall_admin_categories_create(
    adminConnection,
    {
      body: {
        name: "Electronics-" + RandomGenerator.alphabets(6),
        description: "Test electronics category",
      },
    },
  );
  typia.assert(category);
  // Step 3: Register a new seller account
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {});
  typia.assert(sellerAuth);
  // Step 4: Seller submits an approval request
  const approval = await generate_random_shopping_mall_seller_approvals_create(
    sellerConnection,
    { body: {} },
  );
  typia.assert(approval);
  // Step 5: Admin approves the seller's approval request
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
  TestValidator.equals(
    "approval status is approved",
    approvedApproval.status,
    "approved",
  );
  // Step 6: The approved seller creates a product with a specific SKU variant
  const priceOverride = 29900;
  const skuCode = "SHIRT-RED-L";
  const product = await generate_random_shopping_mall_seller_products_create(
    sellerConnection,
    {
      body: {
        name: "Test Shirt",
        description: "A test product for snapshot SKU retrieval",
        base_price: 25000,
        categoryId: category.id,
        images: [
          {
            urls: [typia.random<string & tags.Format<"url">>()],
          },
        ],
        variants: [
          {
            sku: skuCode,
            priceOverride: priceOverride,
            options: [
              {
                key: "color",
                value: "red",
                sequence: 0 as number & tags.Type<"int32">,
              },
              {
                key: "size",
                value: "L",
                sequence: 1 as number & tags.Type<"int32">,
              },
            ],
          },
        ],
      },
    },
  );
  typia.assert(product);
  TestValidator.predicate("product has variants", product.variants.length > 0);
  // Extract the first variant from the product
  const variant = product.variants[0]!;
  // Note: IShoppingMallProduct does not expose a snapshotId directly.
  // The product creation automatically generates a snapshot, but to retrieve its ID
  // we would need a snapshot listing API which is not available in the current SDK.
  // We use the variant ID as the skuId (the snapshot SKU should reference this variant),
  // and generate a placeholder snapshotId.
  // In a real integration, snapshotId would be obtained from a snapshot listing endpoint.
  const snapshotId = typia.random<string & tags.Format<"uuid">>();
  const skuId = variant.id;
  // Step 7: Admin retrieves the snapshot SKU detail
  const snapshotSku =
    await api.functional.shoppingMall.admin.snapshots.skuses.at(
      adminConnection,
      {
        snapshotId: snapshotId,
        skuId: skuId,
      },
    );
  typia.assert(snapshotSku);
  // Validate key fields
  TestValidator.equals("sku id matches", snapshotSku.id, skuId);
  TestValidator.equals(
    "snapshot id matches",
    snapshotSku.productSnapshotId,
    snapshotId,
  );
  TestValidator.equals("sku code matches", snapshotSku.skuCode, skuCode);
  TestValidator.equals(
    "price matches priceOverride",
    snapshotSku.price,
    priceOverride,
  );
  TestValidator.predicate(
    "options array is not empty",
    snapshotSku.options.length > 0,
  );
  // Validate options contain expected key-value pairs
  const colorOption = snapshotSku.options.find((o) => o.key === "color");
  TestValidator.predicate("color option exists", colorOption !== undefined);
  if (colorOption !== undefined) {
    TestValidator.equals("color value is red", colorOption.value, "red");
  }
  const sizeOption = snapshotSku.options.find((o) => o.key === "size");
  TestValidator.predicate("size option exists", sizeOption !== undefined);
  if (sizeOption !== undefined) {
    TestValidator.equals("size value is L", sizeOption.value, "L");
  }
  // Validate immutability: second call returns identical data
  const snapshotSku2 =
    await api.functional.shoppingMall.admin.snapshots.skuses.at(
      adminConnection,
      {
        snapshotId: snapshotId,
        skuId: skuId,
      },
    );
  typia.assert(snapshotSku2);
  TestValidator.equals(
    "immutable response on repeated call",
    snapshotSku,
    snapshotSku2,
  );
}
