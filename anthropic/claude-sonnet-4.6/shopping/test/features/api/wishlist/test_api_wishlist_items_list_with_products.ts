import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallWishlistItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallWishlistItem";
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
import type { IShoppingMallWishlistItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallWishlistItem";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";
import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { generate_random_shopping_mall_admin_categories_create } from "../../../generate/generate_random_shopping_mall_admin_categories_create";
import { generate_random_shopping_mall_customer_wishlist_items_create } from "../../../generate/generate_random_shopping_mall_customer_wishlist_items_create";
import { generate_random_shopping_mall_seller_approvals_create } from "../../../generate/generate_random_shopping_mall_seller_approvals_create";
import { generate_random_shopping_mall_seller_products_create } from "../../../generate/generate_random_shopping_mall_seller_products_create";
import { prepare_random_shopping_mall_category } from "../../../prepare/prepare_random_shopping_mall_category";
import { prepare_random_shopping_mall_product } from "../../../prepare/prepare_random_shopping_mall_product";
import { prepare_random_shopping_mall_product_image } from "../../../prepare/prepare_random_shopping_mall_product_image";
import { prepare_random_shopping_mall_product_variant } from "../../../prepare/prepare_random_shopping_mall_product_variant";
import { prepare_random_shopping_mall_seller_approval } from "../../../prepare/prepare_random_shopping_mall_seller_approval";
import { prepare_random_shopping_mall_wishlist_item } from "../../../prepare/prepare_random_shopping_mall_wishlist_item";

export async function test_api_wishlist_items_list_with_products(
  connection: api.IConnection,
): Promise<void> {
  // ─── 1. Customer registration ───────────────────────────────────────────────
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {});
  // ─── 2. Admin registration ───────────────────────────────────────────────────
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {});
  // ─── 3. Seller registration ──────────────────────────────────────────────────
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerConnection, {});
  // ─── 4. Seller submits approval request ─────────────────────────────────────
  const approval = await generate_random_shopping_mall_seller_approvals_create(
    sellerConnection,
    { body: {} },
  );
  typia.assert(approval);
  // ─── 5. Admin creates a product category ────────────────────────────────────
  const category = await generate_random_shopping_mall_admin_categories_create(
    adminConnection,
    { body: {} },
  );
  typia.assert(category);
  // ─── 6. Admin approves the seller ───────────────────────────────────────────
  const approvedSeller =
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
  typia.assert(approvedSeller);
  // ─── 7. Seller creates 3 products ───────────────────────────────────────────
  const product1 = await generate_random_shopping_mall_seller_products_create(
    sellerConnection,
    { body: { categoryId: category.id } },
  );
  typia.assert(product1);
  const product2 = await generate_random_shopping_mall_seller_products_create(
    sellerConnection,
    { body: { categoryId: category.id } },
  );
  typia.assert(product2);
  const product3 = await generate_random_shopping_mall_seller_products_create(
    sellerConnection,
    { body: { categoryId: category.id } },
  );
  typia.assert(product3);
  // ─── 8. Customer adds each product to wishlist (oldest → newest) ────────────
  const wishlistItem1 =
    await generate_random_shopping_mall_customer_wishlist_items_create(
      customerConnection,
      { body: { shopping_mall_product_id: product1.id } },
    );
  typia.assert(wishlistItem1);
  const wishlistItem2 =
    await generate_random_shopping_mall_customer_wishlist_items_create(
      customerConnection,
      { body: { shopping_mall_product_id: product2.id } },
    );
  typia.assert(wishlistItem2);
  const wishlistItem3 =
    await generate_random_shopping_mall_customer_wishlist_items_create(
      customerConnection,
      { body: { shopping_mall_product_id: product3.id } },
    );
  typia.assert(wishlistItem3);
  // ─── 9. Default request: all defaults ───────────────────────────────────────
  const defaultPage =
    await api.functional.shoppingMall.customer.wishlistItems.index(
      customerConnection,
      {
        body: {} satisfies IShoppingMallWishlistItem.IRequest,
      },
    );
  typia.assert(defaultPage);
  // Verify pagination metadata
  TestValidator.equals(
    "default page current",
    defaultPage.pagination.current,
    1,
  );
  TestValidator.equals(
    "default page records",
    defaultPage.pagination.records,
    3,
  );
  TestValidator.equals("default page pages", defaultPage.pagination.pages, 1);
  TestValidator.equals("default page limit", defaultPage.pagination.limit, 20);
  // Verify data count
  TestValidator.equals("default data length", defaultPage.data.length, 3);
  // Verify default sort is created_at DESC (most recently added first)
  // wishlistItem3 was added last, so it should appear first
  TestValidator.equals(
    "first item is most recently added (item3)",
    defaultPage.data[0].id,
    wishlistItem3.id,
  );
  TestValidator.equals(
    "last item is oldest added (item1)",
    defaultPage.data[2].id,
    wishlistItem1.id,
  );
  // ─── 10. Pagination edge case: page=1, limit=2 ─────────────────────────────
  const page1Limit2 =
    await api.functional.shoppingMall.customer.wishlistItems.index(
      customerConnection,
      {
        body: {
          page: 1,
          limit: 2,
        } satisfies IShoppingMallWishlistItem.IRequest,
      },
    );
  typia.assert(page1Limit2);
  TestValidator.equals("page1limit2 data length", page1Limit2.data.length, 2);
  TestValidator.equals(
    "page1limit2 records",
    page1Limit2.pagination.records,
    3,
  );
  TestValidator.equals("page1limit2 pages", page1Limit2.pagination.pages, 2);
  TestValidator.equals("page1limit2 limit", page1Limit2.pagination.limit, 2);
  TestValidator.equals(
    "page1limit2 current",
    page1Limit2.pagination.current,
    1,
  );
  // ─── 11. Pagination edge case: page=2, limit=2 ─────────────────────────────
  const page2Limit2 =
    await api.functional.shoppingMall.customer.wishlistItems.index(
      customerConnection,
      {
        body: {
          page: 2,
          limit: 2,
        } satisfies IShoppingMallWishlistItem.IRequest,
      },
    );
  typia.assert(page2Limit2);
  TestValidator.equals("page2limit2 data length", page2Limit2.data.length, 1);
  TestValidator.equals(
    "page2limit2 records",
    page2Limit2.pagination.records,
    3,
  );
  TestValidator.equals("page2limit2 pages", page2Limit2.pagination.pages, 2);
  TestValidator.equals(
    "page2limit2 current",
    page2Limit2.pagination.current,
    2,
  );
  // The single item on page 2 should be the oldest-added wishlist item (item1)
  TestValidator.equals(
    "page2 single item is oldest (item1)",
    page2Limit2.data[0].id,
    wishlistItem1.id,
  );
  // ─── 12. Sort by name ────────────────────────────────────────────────────────
  const sortByName =
    await api.functional.shoppingMall.customer.wishlistItems.index(
      customerConnection,
      {
        body: { sort: "name" } satisfies IShoppingMallWishlistItem.IRequest,
      },
    );
  typia.assert(sortByName);
  TestValidator.equals("sortByName data length", sortByName.data.length, 3);
  // Verify alphabetical order (A → Z) by product name
  for (let i = 0; i < sortByName.data.length - 1; i++) {
    const current = sortByName.data[i].product.name;
    const next = sortByName.data[i + 1].product.name;
    TestValidator.predicate(
      `sortByName order: item[${i}] name <= item[${i + 1}] name`,
      current.localeCompare(next) <= 0,
    );
  }
}
