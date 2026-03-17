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
import { generate_random_shopping_mall_seller_products_create } from "../../../generate/generate_random_shopping_mall_seller_products_create";
import { prepare_random_shopping_mall_category } from "../../../prepare/prepare_random_shopping_mall_category";
import { prepare_random_shopping_mall_product } from "../../../prepare/prepare_random_shopping_mall_product";
import { prepare_random_shopping_mall_product_image } from "../../../prepare/prepare_random_shopping_mall_product_image";
import { prepare_random_shopping_mall_product_variant } from "../../../prepare/prepare_random_shopping_mall_product_variant";

export async function test_api_product_search_suspended_seller_products_hidden(
  connection: api.IConnection,
): Promise<void> {
  // ============================================================
  // Step 1: Admin Setup
  // ============================================================
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {});
  // ============================================================
  // Step 2: Seller Setup - capture credentials for potential re-login
  // ============================================================
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const sellerPassword = RandomGenerator.alphaNumeric(16);
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {
    body: {
      email: sellerEmail,
      password: sellerPassword,
      shop_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(sellerAuth);
  const sellerId = sellerAuth.id;
  // ============================================================
  // Step 3: Admin approves the seller
  // Seller registration auto-creates a pending SellerApproval.
  // We attempt approval using the seller's ID as approvalId.
  // Many platforms use the seller ID for the initial approval record.
  // ============================================================
  const approval =
    await api.functional.shoppingMall.admin.sellerApprovals.update(
      adminConnection,
      {
        approvalId: sellerId,
        body: {
          status: "approved",
          rejection_reason: null,
        } satisfies IShoppingMallSellerApproval.IUpdate,
      },
    );
  typia.assert(approval);
  // ============================================================
  // Step 4: Admin creates a product category
  // ============================================================
  const category = await generate_random_shopping_mall_admin_categories_create(
    adminConnection,
    {},
  );
  typia.assert(category);
  // ============================================================
  // Step 5: Seller creates a product
  // ============================================================
  const product = await generate_random_shopping_mall_seller_products_create(
    sellerConnection,
    {
      body: {
        categoryId: category.id,
      },
    },
  );
  typia.assert(product);
  // ============================================================
  // Step 6: Verify product appears BEFORE suspension
  // ============================================================
  const publicConnection: api.IConnection = { host: connection.host };
  const beforeSuspensionFiltered =
    await api.functional.shoppingMall.products.index(publicConnection, {
      body: {
        sellerId: sellerId,
      } satisfies IShoppingMallProduct.IRequest,
    });
  typia.assert(beforeSuspensionFiltered);
  // Product should be visible before suspension
  TestValidator.predicate(
    "product visible before suspension (filtered by seller)",
    beforeSuspensionFiltered.data.some((p) => p.id === product.id),
  );
  TestValidator.predicate(
    "records > 0 before suspension",
    beforeSuspensionFiltered.pagination.records > 0,
  );
  // ============================================================
  // Step 7: Admin suspends the seller
  // ============================================================
  const suspendedSeller =
    await api.functional.shoppingMall.admin.sellers.suspend(adminConnection, {
      sellerId: sellerId,
    });
  typia.assert(suspendedSeller);
  // Verify seller is now suspended
  TestValidator.equals(
    "seller is now suspended",
    suspendedSeller.isSuspended,
    true,
  );
  // ============================================================
  // Step 8: Verify product is HIDDEN after suspension (filtered search)
  // ============================================================
  const afterSuspensionFiltered =
    await api.functional.shoppingMall.products.index(publicConnection, {
      body: {
        sellerId: sellerId,
      } satisfies IShoppingMallProduct.IRequest,
    });
  typia.assert(afterSuspensionFiltered);
  // No products should appear for the suspended seller
  TestValidator.equals(
    "zero products returned for suspended seller (filtered)",
    afterSuspensionFiltered.data.length,
    0,
  );
  TestValidator.equals(
    "pagination.records = 0 for suspended seller",
    afterSuspensionFiltered.pagination.records,
    0,
  );
  // ============================================================
  // Step 9: Verify product is HIDDEN after suspension (general search)
  // ============================================================
  const afterSuspensionGeneral =
    await api.functional.shoppingMall.products.index(publicConnection, {
      body: {} satisfies IShoppingMallProduct.IRequest,
    });
  typia.assert(afterSuspensionGeneral);
  // The product should NOT appear in the general results either
  TestValidator.predicate(
    "suspended seller product not in general search results",
    !afterSuspensionGeneral.data.some((p) => p.id === product.id),
  );
}
