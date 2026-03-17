import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallProduct";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminOfCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminOfCustomer";
import type { IShoppingMallAdminOfSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminOfSeller";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductImage";
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

export async function test_api_admin_seller_products_include_deleted_audit(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register admin account
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_admin_join(adminConnection, {});
  typia.assert(adminAuth);
  // 2. Register seller account
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {});
  typia.assert(sellerAuth);
  const sellerId = sellerAuth.id;
  // 3. Submit seller approval request (as seller)
  const approval = await generate_random_shopping_mall_seller_approvals_create(
    sellerConnection,
    { body: {} },
  );
  typia.assert(approval);
  // 4. As admin, approve the seller
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
  // 5. As admin, create a product category
  const category = await generate_random_shopping_mall_admin_categories_create(
    adminConnection,
    {},
  );
  typia.assert(category);
  // 6. As the approved seller, create two products
  const product1 = await generate_random_shopping_mall_seller_products_create(
    sellerConnection,
    {
      body: {
        categoryId: category.id,
      },
    },
  );
  typia.assert(product1);
  const product2 = await generate_random_shopping_mall_seller_products_create(
    sellerConnection,
    {
      body: {
        categoryId: category.id,
      },
    },
  );
  typia.assert(product2);
  // 7. As the seller, soft-delete one of the products
  await api.functional.shoppingMall.seller.products.erase(sellerConnection, {
    productId: product1.id,
  });
  // --- Primary success scenario: includeDeleted = false ---
  const activeOnlyPage =
    await api.functional.shoppingMall.admin.sellers.products.index(
      adminConnection,
      {
        sellerId,
        body: {
          includeDeleted: false,
        } satisfies IShoppingMallProduct.IRequest,
      },
    );
  typia.assert(activeOnlyPage);
  // Verify only the active product is returned
  TestValidator.equals("active-only count", activeOnlyPage.data.length, 1);
  TestValidator.equals(
    "pagination.records active-only",
    activeOnlyPage.pagination.records,
    1,
  );
  // Verify all returned products have deleted_at === null
  TestValidator.predicate(
    "all active products have null deleted_at",
    activeOnlyPage.data.every((p) => p.deleted_at === null),
  );
  // --- Include deleted products scenario: includeDeleted = true ---
  const includingDeletedPage =
    await api.functional.shoppingMall.admin.sellers.products.index(
      adminConnection,
      {
        sellerId,
        body: {
          includeDeleted: true,
        } satisfies IShoppingMallProduct.IRequest,
      },
    );
  typia.assert(includingDeletedPage);
  // Verify both products are returned
  TestValidator.equals(
    "include-deleted count",
    includingDeletedPage.data.length,
    2,
  );
  TestValidator.equals(
    "pagination.records include-deleted",
    includingDeletedPage.pagination.records,
    2,
  );
  // Find the deleted and active product in the result
  const deletedProduct = includingDeletedPage.data.find(
    (p) => p.id === product1.id,
  );
  const activeProduct = includingDeletedPage.data.find(
    (p) => p.id === product2.id,
  );
  // Verify the deleted product has a non-null deleted_at
  TestValidator.predicate(
    "deleted product exists in audit results",
    deletedProduct !== undefined,
  );
  TestValidator.predicate(
    "deleted product has non-null deleted_at",
    deletedProduct !== undefined && deletedProduct.deleted_at !== null,
  );
  // Verify the active product still has deleted_at === null
  TestValidator.predicate(
    "active product exists in audit results",
    activeProduct !== undefined,
  );
  TestValidator.predicate(
    "active product has null deleted_at",
    activeProduct !== undefined && activeProduct.deleted_at === null,
  );
}
