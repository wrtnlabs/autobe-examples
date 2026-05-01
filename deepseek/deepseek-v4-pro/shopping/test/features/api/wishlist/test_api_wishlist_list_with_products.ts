import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallWishlistItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallWishlistItem";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductImage";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import type { IShoppingMallProductVariantOptionValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariantOptionValue";
import type { IShoppingMallReviewReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallReviewReview";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerProfile";
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
import { generate_random_shopping_mall_customer_wishlist_items_create } from "../../../generate/generate_random_shopping_mall_customer_wishlist_items_create";
import { generate_random_shopping_mall_seller_products_create } from "../../../generate/generate_random_shopping_mall_seller_products_create";
import { prepare_random_shopping_mall_product } from "../../../prepare/prepare_random_shopping_mall_product";
import { prepare_random_shopping_mall_wishlist_item } from "../../../prepare/prepare_random_shopping_mall_wishlist_item";

/**
 * Test wishlist listing with paginated products for an authenticated customer.
 *
 * Validates the complete wishlist retrieval flow including product creation by an approved seller, wishlist population by a customer, and paginated listing of saved items. Ensures pagination metadata is accurate and wishlist entries are sorted newest-first with complete product summary information.
 *
 * Products are created without variants or images, so thumbnail_image_url is null, is_purchasable is false, and both min/max variant prices are null in the product summaries.
 *
 * 1. Administrator registers and approves a new seller.
 * 2. Approved seller creates two products.
 * 3. Customer registers and adds both products to their wishlist.
 * 4. Retrieves wishlist with page=1, limit=10 — validates pagination, sort order, and product data.
 * 5. Tests boundary pagination with page=2, limit=1 — verifies correct paging when records span multiple pages.
 */
export async function test_api_wishlist_list_with_products(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin setup
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {});
  // 2. Seller registration and approval
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller = await authorize_seller_join(sellerConnection, {});
  const approvedSeller =
    await api.functional.shoppingMall.admin.sellers.approve(adminConnection, {
      sellerId: seller.id,
    });
  typia.assert(approvedSeller);
  // 3. Seller creates two products
  const product1 = await generate_random_shopping_mall_seller_products_create(
    sellerConnection,
    {},
  );
  typia.assert(product1);
  const product2 = await generate_random_shopping_mall_seller_products_create(
    sellerConnection,
    {},
  );
  typia.assert(product2);
  // 4. Customer registration and wishlist population
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {});
  const wishlistItem1 =
    await generate_random_shopping_mall_customer_wishlist_items_create(
      customerConnection,
      { body: { product_id: product1.id } },
    );
  typia.assert(wishlistItem1);
  const wishlistItem2 =
    await generate_random_shopping_mall_customer_wishlist_items_create(
      customerConnection,
      { body: { product_id: product2.id } },
    );
  typia.assert(wishlistItem2);
  // 5. List wishlist with pagination (page=1, limit=10)
  const page1 = await api.functional.shoppingMall.customer.wishlist_items.index(
    customerConnection,
    {
      body: {
        page: 1,
        limit: 10,
      } satisfies IShoppingMallWishlistItem.IRequest,
    },
  );
  typia.assert(page1);
  TestValidator.equals("current page", page1.pagination.current, 1);
  TestValidator.equals("page limit", page1.pagination.limit, 10);
  TestValidator.equals("total records", page1.pagination.records, 2);
  TestValidator.equals("total pages", page1.pagination.pages, 1);
  TestValidator.equals("data length", page1.data.length, 2);
  // Newest first: item2 (added last) at index 0, item1 at index 1
  TestValidator.equals(
    "newest wishlist item id",
    page1.data[0].id,
    wishlistItem2.id,
  );
  TestValidator.equals(
    "older wishlist item id",
    page1.data[1].id,
    wishlistItem1.id,
  );
  // Validate product summary fields for each wishlist item
  for (const item of page1.data) {
    TestValidator.predicate(
      "product name non-empty",
      item.product.name.length > 0,
    );
    TestValidator.predicate("base_price positive", item.product.base_price > 0);
    TestValidator.equals("review_count zero", item.product.review_count, 0);
    TestValidator.equals(
      "is_purchasable false (no variants)",
      item.product.is_purchasable,
      false,
    );
  }
  // 6. Boundary pagination test: page=2, limit=1
  const page2 = await api.functional.shoppingMall.customer.wishlist_items.index(
    customerConnection,
    {
      body: {
        page: 2,
        limit: 1,
      } satisfies IShoppingMallWishlistItem.IRequest,
    },
  );
  typia.assert(page2);
  TestValidator.equals("page2 current", page2.pagination.current, 2);
  TestValidator.equals("page2 limit", page2.pagination.limit, 1);
  TestValidator.equals("page2 records", page2.pagination.records, 2);
  TestValidator.equals("page2 pages", page2.pagination.pages, 2);
  TestValidator.equals("page2 data length", page2.data.length, 1);
  TestValidator.equals(
    "page2 contains older item",
    page2.data[0].id,
    wishlistItem1.id,
  );
}
