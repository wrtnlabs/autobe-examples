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

export async function test_api_snapshot_skus_deleted_variant_preserved_in_prior_snapshot(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin Setup - Register and authenticate admin
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "Admin1234!",
    },
  });
  // 2. Admin creates a product category
  const category = await generate_random_shopping_mall_admin_categories_create(
    adminConnection,
    {
      body: {
        name: `TestCategory-${RandomGenerator.alphaNumeric(8)}`,
        description: "Test category for snapshot SKU test",
      },
    },
  );
  typia.assert(category);
  // 3. Seller Setup - Register seller
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const sellerPassword = "Seller1234!";
  await authorize_seller_join(sellerConnection, {
    body: {
      email: sellerEmail,
      password: sellerPassword,
      shop_name: `TestShop-${RandomGenerator.alphaNumeric(6)}`,
      href: "https://example.com/join",
      referrer: "https://example.com",
    },
  });
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
  // Re-authenticate seller after approval (to refresh session if needed)
  const sellerLoginConnection: api.IConnection = { host: connection.host };
  await authorize_seller_login(sellerLoginConnection, {
    body: {
      email: sellerEmail,
      password: sellerPassword,
    } satisfies IShoppingMallSeller.ILogin,
  });
  // 6. Seller creates product with TWO variants
  const product = await generate_random_shopping_mall_seller_products_create(
    sellerLoginConnection,
    {
      body: {
        name: `TestProduct-${RandomGenerator.alphaNumeric(6)}`,
        description: "Product for snapshot immutability test",
        base_price: 10000,
        categoryId: category.id,
        variants: [
          {
            sku: `TO-DELETE-${RandomGenerator.alphaNumeric(6)}`,
            priceOverride: 9000,
            options: [
              {
                id: typia.random<string & tags.Format<"uuid">>(),
                product_variant_id: typia.random<
                  string & tags.Format<"uuid">
                >(),
                key: "size",
                value: "S",
                sequence: 0 as number & tags.Type<"int32">,
                created_at: new Date().toISOString(),
              },
            ],
          },
          {
            sku: `KEEP-${RandomGenerator.alphaNumeric(6)}`,
            priceOverride: 11000,
            options: [
              {
                id: typia.random<string & tags.Format<"uuid">>(),
                product_variant_id: typia.random<
                  string & tags.Format<"uuid">
                >(),
                key: "size",
                value: "L",
                sequence: 0 as number & tags.Type<"int32">,
                created_at: new Date().toISOString(),
              },
            ],
          },
        ],
      },
    },
  );
  typia.assert(product);
  TestValidator.predicate(
    "product has 2 variants",
    product.variants.length >= 2,
  );
  // Identify variant A (to delete) - the first one with 'S' size option
  const variantA = product.variants.find((v) =>
    v.options.some((o) => o.key === "size" && o.value === "S"),
  );
  TestValidator.predicate("variant A exists", variantA !== undefined);
  typia.assertGuard(variantA!);
  // 7. Admin retrieves snapshot list for this product to get Snapshot #1's ID
  const snapshotList =
    await api.functional.shoppingMall.admin.sellers.products.snapshots.index(
      adminConnection,
      {
        sellerId: product.seller.id,
        productId: product.id,
        body: {} satisfies IShoppingMallProductSnapshot.IRequest,
      },
    );
  typia.assert(snapshotList);
  TestValidator.predicate(
    "at least one snapshot exists",
    snapshotList.data.length >= 1,
  );
  // Get Snapshot #1 (the initial one, most recent since it's the only one)
  const snapshot1 = snapshotList.data[0]!;
  // 8. Initial baseline: admin lists Snapshot #1's SKUs - both variants should be present
  const initialSkuList =
    await api.functional.shoppingMall.admin.snapshots.skuses.index(
      adminConnection,
      {
        snapshotId: snapshot1.id,
        body: {} satisfies IShoppingMallProductSnapshotSkus.IRequest,
      },
    );
  typia.assert(initialSkuList);
  TestValidator.equals(
    "initial snapshot has 2 SKUs",
    initialSkuList.pagination.records,
    2,
  );
  // 9. Seller deletes Variant A
  await api.functional.shoppingMall.seller.products.variants.erase(
    sellerLoginConnection,
    {
      productId: product.id,
      variantId: variantA.id,
    },
  );
  // 10. TARGET OPERATION: After deletion, admin queries Snapshot #1's SKUs
  const skuListAfterDeletion =
    await api.functional.shoppingMall.admin.snapshots.skuses.index(
      adminConnection,
      {
        snapshotId: snapshot1.id,
        body: {} satisfies IShoppingMallProductSnapshotSkus.IRequest,
      },
    );
  typia.assert(skuListAfterDeletion);
  // 11. Validation: snapshot is immutable - still has 2 SKU records
  TestValidator.equals(
    "snapshot still has 2 SKUs after variant deletion",
    skuListAfterDeletion.pagination.records,
    2,
  );
  TestValidator.equals(
    "snapshot data array still has 2 entries",
    skuListAfterDeletion.data.length,
    2,
  );
  // Verify the deleted variant's SKU is still in the snapshot
  const deletedVariantSku = skuListAfterDeletion.data.find((sku) =>
    sku.options.some((o) => o.key === "size" && o.value === "S"),
  );
  TestValidator.predicate(
    "deleted variant SKU is still in prior snapshot",
    deletedVariantSku !== undefined,
  );
  // Verify the kept variant's SKU is still in the snapshot
  const keptVariantSku = skuListAfterDeletion.data.find((sku) =>
    sku.options.some((o) => o.key === "size" && o.value === "L"),
  );
  TestValidator.predicate(
    "kept variant SKU is still in snapshot",
    keptVariantSku !== undefined,
  );
  // Verify price preservation in snapshot
  typia.assertGuard(deletedVariantSku!);
  TestValidator.predicate(
    "deleted variant price preserved in snapshot",
    deletedVariantSku.price > 0,
  );
  typia.assertGuard(keptVariantSku!);
  TestValidator.predicate(
    "kept variant price preserved in snapshot",
    keptVariantSku.price > 0,
  );
}
