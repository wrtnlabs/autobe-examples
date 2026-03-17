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
import { generate_random_shopping_mall_seller_products_variants_create } from "../../../generate/generate_random_shopping_mall_seller_products_variants_create";
import { prepare_random_shopping_mall_category } from "../../../prepare/prepare_random_shopping_mall_category";
import { prepare_random_shopping_mall_product } from "../../../prepare/prepare_random_shopping_mall_product";
import { prepare_random_shopping_mall_product_image } from "../../../prepare/prepare_random_shopping_mall_product_image";
import { prepare_random_shopping_mall_product_variant } from "../../../prepare/prepare_random_shopping_mall_product_variant";
import { prepare_random_shopping_mall_seller_approval } from "../../../prepare/prepare_random_shopping_mall_seller_approval";

export async function test_api_product_snapshot_sku_options_filtered_by_key(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin joins
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {});
  // 2. Admin creates a category
  const category = await generate_random_shopping_mall_admin_categories_create(
    adminConnection,
    { body: { name: RandomGenerator.alphabets(8) } },
  );
  typia.assert(category);
  // 3. Seller joins
  const sellerPassword = RandomGenerator.alphaNumeric(16);
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: sellerPassword,
      shop_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  // 4. Seller submits approval
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
  // 6. Seller creates a product with the category
  const product = await generate_random_shopping_mall_seller_products_create(
    sellerConnection,
    {
      body: {
        categoryId: category.id,
        name: RandomGenerator.paragraph({ sentences: 2 }),
        description: RandomGenerator.paragraph({ sentences: 3 }),
        base_price: 10000,
      },
    },
  );
  typia.assert(product);
  // 7. Seller creates a variant with three distinct options (color, size, material)
  const variantBody = {
    sku: `test-sku-${RandomGenerator.alphaNumeric(12)}`,
    priceOverride: null,
    options: [
      {
        id: typia.random<string & tags.Format<"uuid">>(),
        product_variant_id: typia.random<string & tags.Format<"uuid">>(),
        key: "color",
        value: "blue",
        sequence: 0 as number & tags.Type<"int32">,
        created_at: new Date().toISOString() as string &
          tags.Format<"date-time">,
      },
      {
        id: typia.random<string & tags.Format<"uuid">>(),
        product_variant_id: typia.random<string & tags.Format<"uuid">>(),
        key: "size",
        value: "M",
        sequence: 1 as number & tags.Type<"int32">,
        created_at: new Date().toISOString() as string &
          tags.Format<"date-time">,
      },
      {
        id: typia.random<string & tags.Format<"uuid">>(),
        product_variant_id: typia.random<string & tags.Format<"uuid">>(),
        key: "material",
        value: "cotton",
        sequence: 2 as number & tags.Type<"int32">,
        created_at: new Date().toISOString() as string &
          tags.Format<"date-time">,
      },
    ] satisfies IShoppingMallProductVariantOption[],
  } satisfies IShoppingMallProductVariant.ICreate;
  const variant =
    await generate_random_shopping_mall_seller_products_variants_create(
      sellerConnection,
      {
        params: { productId: product.id },
        body: variantBody,
      },
    );
  typia.assert(variant);
  // 8. List snapshots to get snapshotId
  const snapshotsPage =
    await api.functional.shoppingMall.seller.products.snapshots.index(
      sellerConnection,
      {
        productId: product.id,
        body: {} satisfies IShoppingMallProductSnapshot.IRequest,
      },
    );
  typia.assert(snapshotsPage);
  TestValidator.predicate(
    "snapshots exist",
    () => snapshotsPage.data.length > 0,
  );
  const snapshotId = snapshotsPage.data[0]!.id;
  // 9. List snapshot SKUs to get skuId
  const skusPage =
    await api.functional.shoppingMall.seller.products.snapshots.skuses.index(
      sellerConnection,
      {
        productId: product.id,
        snapshotId: snapshotId,
        body: {} satisfies IShoppingMallProductSnapshotSkus.IRequest,
      },
    );
  typia.assert(skusPage);
  TestValidator.predicate("skus exist", () => skusPage.data.length > 0);
  const skuId = skusPage.data[0]!.id;
  // Test A: Filter by key partial match ('col' matches 'color')
  const resultA =
    await api.functional.shoppingMall.seller.products.snapshots.skuses.options.index(
      sellerConnection,
      {
        productId: product.id,
        snapshotId: snapshotId,
        skuId: skuId,
        body: {
          key: "col",
        } satisfies IShoppingMallProductSnapshotSkusOption.IRequest,
      },
    );
  typia.assert(resultA);
  TestValidator.predicate(
    "Test A: records equals 1",
    () => resultA.pagination.records === 1,
  );
  TestValidator.predicate(
    "Test A: data has exactly 1 item",
    () => resultA.data.length === 1,
  );
  TestValidator.predicate("Test A: result key contains 'col'", () =>
    resultA.data.every((opt) => opt.key.toLowerCase().includes("col")),
  );
  TestValidator.predicate("Test A: no size or material options", () =>
    resultA.data.every(
      (opt) =>
        !opt.key.toLowerCase().includes("size") &&
        !opt.key.toLowerCase().includes("material"),
    ),
  );
  TestValidator.predicate(
    "Test A: product_snapshot_skus_id matches skuId",
    () => resultA.data.every((opt) => opt.product_snapshot_skus_id === skuId),
  );
  // Test B: Filter by value partial match ('cot' matches 'cotton')
  const resultB =
    await api.functional.shoppingMall.seller.products.snapshots.skuses.options.index(
      sellerConnection,
      {
        productId: product.id,
        snapshotId: snapshotId,
        skuId: skuId,
        body: {
          value: "cot",
        } satisfies IShoppingMallProductSnapshotSkusOption.IRequest,
      },
    );
  typia.assert(resultB);
  TestValidator.predicate(
    "Test B: records equals 1",
    () => resultB.pagination.records === 1,
  );
  TestValidator.predicate(
    "Test B: data has exactly 1 item",
    () => resultB.data.length === 1,
  );
  TestValidator.predicate("Test B: result value contains 'cot'", () =>
    resultB.data.every((opt) => opt.value.toLowerCase().includes("cot")),
  );
  TestValidator.predicate(
    "Test B: product_snapshot_skus_id matches skuId",
    () => resultB.data.every((opt) => opt.product_snapshot_skus_id === skuId),
  );
  // Test C: Pagination with limit=1, page=1
  const resultC1 =
    await api.functional.shoppingMall.seller.products.snapshots.skuses.options.index(
      sellerConnection,
      {
        productId: product.id,
        snapshotId: snapshotId,
        skuId: skuId,
        body: {
          limit: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
          page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
        } satisfies IShoppingMallProductSnapshotSkusOption.IRequest,
      },
    );
  typia.assert(resultC1);
  TestValidator.predicate(
    "Test C: page 1 data.length === 1",
    () => resultC1.data.length === 1,
  );
  TestValidator.predicate(
    "Test C: total records === 3",
    () => resultC1.pagination.records === 3,
  );
  TestValidator.predicate(
    "Test C: total pages === 3",
    () => resultC1.pagination.pages === 3,
  );
  TestValidator.predicate(
    "Test C: current page === 1",
    () => resultC1.pagination.current === 1,
  );
  TestValidator.predicate(
    "Test C page 1: product_snapshot_skus_id matches skuId",
    () => resultC1.data.every((opt) => opt.product_snapshot_skus_id === skuId),
  );
  // Test C: Pagination with limit=1, page=2
  const resultC2 =
    await api.functional.shoppingMall.seller.products.snapshots.skuses.options.index(
      sellerConnection,
      {
        productId: product.id,
        snapshotId: snapshotId,
        skuId: skuId,
        body: {
          limit: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
          page: 2 as number & tags.Type<"int32"> & tags.Minimum<1>,
        } satisfies IShoppingMallProductSnapshotSkusOption.IRequest,
      },
    );
  typia.assert(resultC2);
  TestValidator.predicate(
    "Test C: page 2 data.length === 1",
    () => resultC2.data.length === 1,
  );
  TestValidator.predicate(
    "Test C: current page 2 === 2",
    () => resultC2.pagination.current === 2,
  );
  TestValidator.predicate(
    "Test C: page 2 sequence > page 1 sequence",
    () => resultC2.data[0]!.sequence > resultC1.data[0]!.sequence,
  );
  TestValidator.predicate(
    "Test C page 2: product_snapshot_skus_id matches skuId",
    () => resultC2.data.every((opt) => opt.product_snapshot_skus_id === skuId),
  );
}
