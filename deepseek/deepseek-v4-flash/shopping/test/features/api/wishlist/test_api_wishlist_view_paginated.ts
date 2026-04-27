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

export async function test_api_wishlist_view_paginated(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register customer
  const customerConnection: api.IConnection = { host: connection.host };
  const customer = await authorize_customer_join(customerConnection, {});
  // 2. Register seller
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerConnection, {});
  // 3. As seller, create a product
  const product = await generate_random_e_commerce_mall_seller_products_create(
    sellerConnection,
    {},
  );
  typia.assert(product);
  // 4. As customer, add the product to wishlist
  const wishlistItem =
    await generate_random_e_commerce_mall_customer_wishlist_items_create(
      customerConnection,
      {
        body: {
          product_id: product.id,
        },
      },
    );
  typia.assert(wishlistItem);
  // 5. As customer, view wishlist with pagination
  const page = await api.functional.eCommerceMall.customer.wishlist_items.index(
    customerConnection,
    {
      body: {} satisfies IECommerceMallWishlistItem.IRequest,
    },
  );
  typia.assert(page);
  // 6. Verify pagination metadata
  TestValidator.equals("pagination current", page.pagination.current, 1);
  TestValidator.equals("pagination limit", page.pagination.limit, 10);
  TestValidator.equals("pagination records", page.pagination.records, 1);
  TestValidator.equals("pagination pages", page.pagination.pages, 1);
  // 7. Verify data
  TestValidator.equals("data length", page.data.length, 1);
  const item = page.data[0];
  typia.assert(item);
  TestValidator.equals("item customer id", item.customer.id, customer.id);
  TestValidator.equals(
    "item customer email",
    item.customer.email,
    customer.email,
  );
  TestValidator.equals("item product id", item.product.id, product.id);
  TestValidator.equals("item product name", item.product.name, product.name);
  TestValidator.equals(
    "item product base_price",
    item.product.base_price,
    product.base_price,
  );
  TestValidator.equals(
    "item product visibility",
    item.product.visibility,
    "visible",
  );
  TestValidator.predicate("item product thumbnail is string or null", () => {
    if (item.product.thumbnail === null) return true;
    return typeof item.product.thumbnail === "string";
  });
  TestValidator.predicate("item created_at is ISO 8601", () => {
    return !isNaN(Date.parse(item.created_at));
  });
}
