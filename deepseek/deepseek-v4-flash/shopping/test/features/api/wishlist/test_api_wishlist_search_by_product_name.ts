import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IECommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallCategory";
import type { IECommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallCustomer";
import type { IECommerceMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallCustomerProfile";
import type { IECommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallOrder";
import type { IECommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallOrderItem";
import type { IECommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallProduct";
import type { IECommerceMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallProductImage";
import type { IECommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallProductVariant";
import type { IECommerceMallProductVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallProductVariantOption";
import type { IECommerceMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallReview";
import type { IECommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallSeller";
import type { IECommerceMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallSellerProfile";
import type { IECommerceMallWishlistItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallWishlistItem";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIECommerceMallWishlistItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIECommerceMallWishlistItem";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";
import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { generate_random_e_commerce_mall_customer_wishlist_items_create } from "../../../generate/generate_random_e_commerce_mall_customer_wishlist_items_create";
import { generate_random_e_commerce_mall_seller_products_create } from "../../../generate/generate_random_e_commerce_mall_seller_products_create";
import { prepare_random_ecommerce_mall_product } from "../../../prepare/prepare_random_ecommerce_mall_product";
import { prepare_random_ecommerce_mall_wishlist_item } from "../../../prepare/prepare_random_ecommerce_mall_wishlist_item";

/**
 * Test wishlist search filtering by product name with partial match validation.
 *
 * Validates that the customer can filter their wishlist items by searching for a keyword that partially matches the saved product's name. The search is expected to be case-insensitive and perform a LIKE '%keyword%' match against the product name via a JOIN with the products table.
 *
 * 1. Register a customer and a seller on the platform.
 * 2. As seller, create two products with distinctly different names: "Wireless Bluetooth Headphones" and "Ergonomic Laptop Stand".
 * 3. As customer, add both products to their wishlist.
 * 4. As customer, search wishlist with "Headphones" — verify only the matching item is returned.
 * 5. As customer, search wishlist with "Laptop" — verify only the matching item is returned.
 * 6. As customer, search wishlist without any search keyword — verify both items are returned.
 */
export async function test_api_wishlist_search_by_product_name(
  connection: api.IConnection,
): Promise<void> {
  // Actor-specific connections
  const customerConnection: api.IConnection = { host: connection.host };
  const sellerConnection: api.IConnection = { host: connection.host };
  // 1. Register customer and seller
  const customer = await authorize_customer_join(customerConnection, {});
  typia.assert(customer);
  const seller = await authorize_seller_join(sellerConnection, {});
  typia.assert(seller);
  // 2. Create two products with distinctly different names
  const product1 = await generate_random_e_commerce_mall_seller_products_create(
    sellerConnection,
    {
      body: {
        name: "Wireless Bluetooth Headphones",
      },
    },
  );
  typia.assert(product1);
  const product2 = await generate_random_e_commerce_mall_seller_products_create(
    sellerConnection,
    {
      body: {
        name: "Ergonomic Laptop Stand",
      },
    },
  );
  typia.assert(product2);
  // 3. Add both products to customer's wishlist
  await generate_random_e_commerce_mall_customer_wishlist_items_create(
    customerConnection,
    {
      body: {
        product_id: product1.id,
      },
    },
  );
  await generate_random_e_commerce_mall_customer_wishlist_items_create(
    customerConnection,
    {
      body: {
        product_id: product2.id,
      },
    },
  );
  // 4. Search wishlist with "Headphones"
  const headphonesResult =
    await api.functional.eCommerceMall.customer.wishlist_items.index(
      customerConnection,
      {
        body: {
          page: 1,
          limit: 10,
          search: "Headphones",
        } satisfies IECommerceMallWishlistItem.IRequest,
      },
    );
  typia.assert(headphonesResult);
  TestValidator.equals(
    "headphones search item count",
    headphonesResult.data.length,
    1,
  );
  TestValidator.equals(
    "headphones search records",
    headphonesResult.pagination.records,
    1,
  );
  TestValidator.predicate(
    "first wishlist product name contains 'Headphones'",
    headphonesResult.data[0].product.name.includes("Headphones"),
  );
  // 5. Search wishlist with "Laptop"
  const laptopResult =
    await api.functional.eCommerceMall.customer.wishlist_items.index(
      customerConnection,
      {
        body: {
          page: 1,
          limit: 10,
          search: "Laptop",
        } satisfies IECommerceMallWishlistItem.IRequest,
      },
    );
  typia.assert(laptopResult);
  TestValidator.equals("laptop search item count", laptopResult.data.length, 1);
  TestValidator.equals(
    "laptop search records",
    laptopResult.pagination.records,
    1,
  );
  TestValidator.predicate(
    "first wishlist product name contains 'Laptop'",
    laptopResult.data[0].product.name.includes("Laptop"),
  );
  // 6. Search wishlist without any keyword — both items should be returned
  const allResult =
    await api.functional.eCommerceMall.customer.wishlist_items.index(
      customerConnection,
      {
        body: {
          page: 1,
          limit: 10,
        } satisfies IECommerceMallWishlistItem.IRequest,
      },
    );
  typia.assert(allResult);
  TestValidator.equals("all wishlist items count", allResult.data.length, 2);
  TestValidator.equals(
    "all wishlist items records",
    allResult.pagination.records,
    2,
  );
}
