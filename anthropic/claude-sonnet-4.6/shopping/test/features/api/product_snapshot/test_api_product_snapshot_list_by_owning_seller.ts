import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallProductSnapshot";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminOfCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminOfCustomer";
import type { IShoppingMallAdminOfSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminOfSeller";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductImage";
import type { IShoppingMallProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductSnapshot";
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

export async function test_api_product_snapshot_list_by_owning_seller(
  connection: api.IConnection,
): Promise<void> {
  // ─── 1. Admin Setup ───────────────────────────────────────────────────
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {});
  // ─── 2. Admin creates a product category ──────────────────────────────
  const category = await generate_random_shopping_mall_admin_categories_create(
    adminConnection,
    {},
  );
  typia.assert(category);
  // ─── 3. Register seller ───────────────────────────────────────────────
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const sellerPassword = RandomGenerator.alphaNumeric(16);
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerConnection, {
    body: {
      email: sellerEmail,
      password: sellerPassword,
    },
  });
  // ─── 4. Seller submits approval request ───────────────────────────────
  const approval = await generate_random_shopping_mall_seller_approvals_create(
    sellerConnection,
    {},
  );
  typia.assert(approval);
  // ─── 5. Admin approves the seller ─────────────────────────────────────
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
  // ─── 6. Seller re-authenticates (to reflect approved status) ──────────
  const reAuthSellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_login(reAuthSellerConnection, {
    body: {
      email: sellerEmail,
      password: sellerPassword,
    } satisfies IShoppingMallSeller.ILogin,
  });
  // ─── 7. Seller creates a product ──────────────────────────────────────
  const productName = RandomGenerator.paragraph({ sentences: 3 });
  const beforeCreate = new Date();
  const product = await generate_random_shopping_mall_seller_products_create(
    reAuthSellerConnection,
    {
      body: {
        name: productName,
        description: RandomGenerator.paragraph({ sentences: 5 }),
        base_price: 9999,
        categoryId: category.id,
      },
    },
  );
  typia.assert(product);
  const afterCreate = new Date();
  // ─── 8. Primary Success Path: empty body ──────────────────────────────
  const snapshotPage =
    await api.functional.shoppingMall.seller.products.snapshots.index(
      reAuthSellerConnection,
      {
        productId: product.id,
        body: {},
      },
    );
  typia.assert(snapshotPage);
  TestValidator.predicate(
    "pagination.records >= 1",
    snapshotPage.pagination.records >= 1,
  );
  TestValidator.predicate(
    "data is non-empty array",
    snapshotPage.data.length >= 1,
  );
  // Verify newest-first ordering
  if (snapshotPage.data.length > 1) {
    for (let i = 0; i < snapshotPage.data.length - 1; i++) {
      const current = new Date(snapshotPage.data[i]!.created_at).getTime();
      const next = new Date(snapshotPage.data[i + 1]!.created_at).getTime();
      TestValidator.predicate(
        "snapshots ordered newest first",
        current >= next,
      );
    }
  }
  // Verify business fields match what was created (latest snapshot)
  const latestSnapshot = snapshotPage.data[0]!;
  TestValidator.equals(
    "snapshot name matches product name",
    latestSnapshot.name,
    productName,
  );
  TestValidator.equals(
    "snapshot base_price matches",
    latestSnapshot.base_price,
    9999,
  );
  // ─── 9. Pagination: page=1, limit=5 ───────────────────────────────────
  const pagedResult =
    await api.functional.shoppingMall.seller.products.snapshots.index(
      reAuthSellerConnection,
      {
        productId: product.id,
        body: {
          page: 1,
          limit: 5,
        } satisfies IShoppingMallProductSnapshot.IRequest,
      },
    );
  typia.assert(pagedResult);
  TestValidator.equals(
    "pagination.current equals 1",
    pagedResult.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination.limit equals 5",
    pagedResult.pagination.limit,
    5,
  );
  TestValidator.predicate(
    "data length does not exceed 5",
    pagedResult.data.length <= 5,
  );
  // ─── 10. Date Range Filter (inclusive) ────────────────────────────────
  const fromBefore = new Date(beforeCreate.getTime() - 60000).toISOString();
  const toFuture = new Date(afterCreate.getTime() + 60000).toISOString();
  const inclusiveResult =
    await api.functional.shoppingMall.seller.products.snapshots.index(
      reAuthSellerConnection,
      {
        productId: product.id,
        body: {
          from: fromBefore,
          to: toFuture,
        } satisfies IShoppingMallProductSnapshot.IRequest,
      },
    );
  typia.assert(inclusiveResult);
  TestValidator.predicate(
    "snapshot included in inclusive date range",
    inclusiveResult.data.length >= 1,
  );
  // ─── 11. Date Range Filter (exclusive) ────────────────────────────────
  const wayPast = new Date(beforeCreate.getTime() - 120000).toISOString();
  const justBeforeCreate = new Date(beforeCreate.getTime() - 1).toISOString();
  const exclusiveResult =
    await api.functional.shoppingMall.seller.products.snapshots.index(
      reAuthSellerConnection,
      {
        productId: product.id,
        body: {
          from: wayPast,
          to: justBeforeCreate,
        } satisfies IShoppingMallProductSnapshot.IRequest,
      },
    );
  typia.assert(exclusiveResult);
  TestValidator.equals(
    "snapshot excluded from exclusive date range",
    exclusiveResult.data.length,
    0,
  );
  // ─── 12. Name Filter (matching) ───────────────────────────────────────
  const words = productName.split(" ");
  const keyword = words[0]!;
  const nameMatchResult =
    await api.functional.shoppingMall.seller.products.snapshots.index(
      reAuthSellerConnection,
      {
        productId: product.id,
        body: {
          name: keyword,
        } satisfies IShoppingMallProductSnapshot.IRequest,
      },
    );
  typia.assert(nameMatchResult);
  TestValidator.predicate(
    "snapshot found with matching name filter",
    nameMatchResult.data.length >= 1,
  );
  // ─── 13. Name Filter (non-matching) ───────────────────────────────────
  const nonMatchingName = `NOMATCH_${RandomGenerator.alphaNumeric(20)}`;
  const noNameMatchResult =
    await api.functional.shoppingMall.seller.products.snapshots.index(
      reAuthSellerConnection,
      {
        productId: product.id,
        body: {
          name: nonMatchingName,
        } satisfies IShoppingMallProductSnapshot.IRequest,
      },
    );
  typia.assert(noNameMatchResult);
  TestValidator.equals(
    "no snapshot found with non-matching name filter",
    noNameMatchResult.data.length,
    0,
  );
}
