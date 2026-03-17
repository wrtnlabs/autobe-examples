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

export async function test_api_wishlist_items_list_empty_wishlist(
  connection: api.IConnection,
): Promise<void> {
  // ──────────────────────────────────────────────────────────────────────────
  // Step 1: Register Customer 1 (the customer with empty wishlist)
  // ──────────────────────────────────────────────────────────────────────────
  const customer1Connection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customer1Connection, {});
  // ──────────────────────────────────────────────────────────────────────────
  // Step 2: Customer 1 queries their wishlist — should be empty
  // ──────────────────────────────────────────────────────────────────────────
  const emptyResult =
    await api.functional.shoppingMall.customer.wishlistItems.index(
      customer1Connection,
      {
        body: {} satisfies IShoppingMallWishlistItem.IRequest,
      },
    );
  typia.assert(emptyResult);
  TestValidator.predicate(
    "empty wishlist records is 0",
    emptyResult.pagination.records === 0,
  );
  TestValidator.predicate(
    "empty wishlist pages is 0",
    emptyResult.pagination.pages === 0,
  );
  TestValidator.predicate(
    "empty wishlist current page is 1",
    emptyResult.pagination.current === 1,
  );
  TestValidator.predicate(
    "empty wishlist data is empty array",
    emptyResult.data.length === 0,
  );
  // ──────────────────────────────────────────────────────────────────────────
  // Step 3: Data isolation — set up admin + seller + product + customer2
  // ──────────────────────────────────────────────────────────────────────────
  // 3a. Register admin
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {});
  // 3b. Register seller
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerConnection, {});
  // 3c. Seller submits approval request
  const approval = await generate_random_shopping_mall_seller_approvals_create(
    sellerConnection,
    {},
  );
  typia.assert(approval);
  // 3d. Admin approves the seller
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
  // 3e. Admin creates a category
  const category = await generate_random_shopping_mall_admin_categories_create(
    adminConnection,
    {},
  );
  typia.assert(category);
  // 3f. Seller creates a product using the category
  const product = await generate_random_shopping_mall_seller_products_create(
    sellerConnection,
    {
      body: {
        categoryId: category.id,
      },
    },
  );
  typia.assert(product);
  // 3g. Register Customer 2
  const customer2Connection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customer2Connection, {});
  // 3h. Customer 2 adds the product to their wishlist
  const wishlistItem =
    await generate_random_shopping_mall_customer_wishlist_items_create(
      customer2Connection,
      {
        body: {
          shopping_mall_product_id: product.id,
        },
      },
    );
  typia.assert(wishlistItem);
  // ──────────────────────────────────────────────────────────────────────────
  // Step 4: Customer 1 queries wishlist again — still must be empty (data isolation)
  // ──────────────────────────────────────────────────────────────────────────
  const isolatedResult =
    await api.functional.shoppingMall.customer.wishlistItems.index(
      customer1Connection,
      {
        body: {} satisfies IShoppingMallWishlistItem.IRequest,
      },
    );
  typia.assert(isolatedResult);
  TestValidator.predicate(
    "isolated wishlist records is 0",
    isolatedResult.pagination.records === 0,
  );
  TestValidator.predicate(
    "isolated wishlist pages is 0",
    isolatedResult.pagination.pages === 0,
  );
  TestValidator.predicate(
    "isolated wishlist data is empty array",
    isolatedResult.data.length === 0,
  );
}
