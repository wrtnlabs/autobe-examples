import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCancellationRequest";
import type { IEcommerceMallCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCart";
import type { IEcommerceMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCartItem";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomerProfile";
import type { IEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrder";
import type { IEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItem";
import type { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import type { IEcommerceMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductImage";
import type { IEcommerceMallProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductSnapshot";
import type { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import type { IEcommerceMallProductVariantOptionValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariantOptionValue";
import type { IEcommerceMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallRefundRequest";
import type { IEcommerceMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallReview";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfile";
import type { IEcommerceMallSellerProfileSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfileSnapshot";
import type { IEcommerceMallShippingAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShippingAddress";
import type { IEcommerceMallWishlistItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallWishlistItem";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallWishlistItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallWishlistItem";
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
import { generate_random_ecommerce_mall_customer_customers_wishlist_create } from "../../../generate/generate_random_ecommerce_mall_customer_customers_wishlist_create";
import { generate_random_ecommerce_mall_seller_products_create } from "../../../generate/generate_random_ecommerce_mall_seller_products_create";
import { prepare_random_ecommerce_mall_product } from "../../../prepare/prepare_random_ecommerce_mall_product";
import { prepare_random_ecommerce_mall_wishlist_item } from "../../../prepare/prepare_random_ecommerce_mall_wishlist_item";

export async function test_api_wishlist_retrieve_paginated_with_products(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register seller and create 2 products
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerConnection, {});
  const product1 = await generate_random_ecommerce_mall_seller_products_create(
    sellerConnection,
    {},
  );
  typia.assert(product1);
  const product2 = await generate_random_ecommerce_mall_seller_products_create(
    sellerConnection,
    {},
  );
  typia.assert(product2);
  // 2. Register customer
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {});
  // 3. Add both products to wishlist
  await api.functional.ecommerceMall.customer.customers.wishlist.create(
    customerConnection,
    {
      body: {
        product_id: product1.id,
      } satisfies IEcommerceMallWishlistItem.ICreate,
    },
  );
  await api.functional.ecommerceMall.customer.customers.wishlist.create(
    customerConnection,
    {
      body: {
        product_id: product2.id,
      } satisfies IEcommerceMallWishlistItem.ICreate,
    },
  );
  // 4. Retrieve wishlist with default pagination (page=1, limit=20, sort_by=newest)
  const wishlistPage =
    await api.functional.ecommerceMall.customer.wishlist.index(
      customerConnection,
      {
        body: {
          page: 1,
          limit: 20,
          sort_by: "newest",
        } satisfies IEcommerceMallWishlistItem.IRequest,
      },
    );
  typia.assert(wishlistPage);
  // 5. Validate pagination metadata
  TestValidator.equals("current page is 1", wishlistPage.pagination.current, 1);
  TestValidator.equals(
    "total records is 2",
    wishlistPage.pagination.records,
    2,
  );
  TestValidator.equals("total pages is 1", wishlistPage.pagination.pages, 1);
  // 6. Validate data contains 2 wishlist items
  TestValidator.equals("has 2 wishlist items", wishlistPage.data.length, 2);
  // 7. Validate each wishlist item has required product fields from ISummary
  for (const item of wishlistPage.data) {
    TestValidator.predicate("product has id", item.product.id !== undefined);
    TestValidator.predicate(
      "product has name",
      item.product.name !== undefined,
    );
    TestValidator.predicate(
      "product has primary_image_url",
      item.product.primary_image_url !== undefined,
    );
    TestValidator.predicate(
      "product has seller_name",
      item.product.seller_name !== undefined,
    );
    TestValidator.predicate(
      "product has min_price",
      typeof item.product.min_price === "number",
    );
    TestValidator.predicate(
      "product has max_price",
      typeof item.product.max_price === "number",
    );
    TestValidator.predicate(
      "product has average_rating",
      typeof item.product.average_rating === "number",
    );
    TestValidator.predicate(
      "product has reviews_count",
      typeof item.product.reviews_count === "number",
    );
  }
  // 8. Validate items contain expected products
  const productIds = wishlistPage.data.map((item) => item.product.id);
  TestValidator.equals(
    "first product in wishlist",
    productIds.includes(product1.id),
    true,
  );
  TestValidator.equals(
    "second product in wishlist",
    productIds.includes(product2.id),
    true,
  );
  // 9. Validate items ordered by created_at descending (newest first)
  if (wishlistPage.data.length >= 2) {
    TestValidator.predicate(
      "items ordered by newest",
      new Date(wishlistPage.data[0].created_at) >=
        new Date(wishlistPage.data[1].created_at),
    );
  }
}
