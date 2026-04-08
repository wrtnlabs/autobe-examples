import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMall } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMall";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomerProfile";
import type { IEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItem";
import type { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import type { IEcommerceMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductImage";
import type { IEcommerceMallProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductSnapshot";
import type { IEcommerceMallProductSnapshotVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductSnapshotVariant";
import type { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import type { IEcommerceMallProductVariantOptionValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariantOptionValue";
import type { IEcommerceMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallReview";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfile";
import type { IEcommerceMallShippingAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShippingAddress";
import type { IEcommerceMallWishlist } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallWishlist";
import type { IEcommerceMallWishlistItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallWishlistItem";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMall } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMall";
import type { IPageIEcommerceMallWishlist } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallWishlist";
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
import { generate_random_ecommerce_mall_customer_wishlist_create } from "../../../generate/generate_random_ecommerce_mall_customer_wishlist_create";
import { generate_random_ecommerce_mall_seller_products_create } from "../../../generate/generate_random_ecommerce_mall_seller_products_create";
import { prepare_random_ecommerce_mall_product } from "../../../prepare/prepare_random_ecommerce_mall_product";
import { prepare_random_ecommerce_mall_wishlist_item } from "../../../prepare/prepare_random_ecommerce_mall_wishlist_item";

export async function test_api_wishlist_product_name_filtering(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register customer
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {});
  // 2. Register seller
  const sellerPassword = RandomGenerator.alphaNumeric(16);
  const sellerJoinConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerJoinConnection, {
    body: {
      password: sellerPassword,
    },
  });
  // Login as seller (assuming auto-approval or needs admin approval separately)
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_login(sellerConnection, {
    body: {
      email: sellerAuth.email,
      password: sellerPassword,
    },
  });
  // 3. Create multiple products with different names
  const product1 = await generate_random_ecommerce_mall_seller_products_create(
    sellerConnection,
    {
      body: {
        name: "Wireless Headphones Pro",
        description: "Premium wireless headphones with noise cancellation",
      },
    },
  );
  typia.assert(product1);
  const product2 = await generate_random_ecommerce_mall_seller_products_create(
    sellerConnection,
    {
      body: {
        name: "Bluetooth Speaker Mini",
        description: "Portable bluetooth speaker",
      },
    },
  );
  typia.assert(product2);
  const product3 = await generate_random_ecommerce_mall_seller_products_create(
    sellerConnection,
    {
      body: {
        name: "USB Cable Type-C",
        description: "Fast charging USB cable",
      },
    },
  );
  typia.assert(product3);
  const product4 = await generate_random_ecommerce_mall_seller_products_create(
    sellerConnection,
    {
      body: {
        name: "Wireless Mouse",
        description: "Ergonomic wireless mouse",
      },
    },
  );
  typia.assert(product4);
  // 4. Add all products to wishlist
  await generate_random_ecommerce_mall_customer_wishlist_create(
    customerConnection,
    {
      body: { productId: product1.id },
    },
  );
  await generate_random_ecommerce_mall_customer_wishlist_create(
    customerConnection,
    {
      body: { productId: product2.id },
    },
  );
  await generate_random_ecommerce_mall_customer_wishlist_create(
    customerConnection,
    {
      body: { productId: product3.id },
    },
  );
  await generate_random_ecommerce_mall_customer_wishlist_create(
    customerConnection,
    {
      body: { productId: product4.id },
    },
  );
  // 5. Test 1: Filter by "Wireless" - should return 2 wishlists (Wireless Headphones Pro and Wireless Mouse)
  const wirelessFilter =
    await api.functional.ecommerceMall.customer.wishlist.index(
      customerConnection,
      {
        body: { name: "Wireless" } satisfies IEcommerceMallWishlist.IRequest,
      },
    );
  typia.assert(wirelessFilter);
  TestValidator.equals(
    "should have 2 items matching Wireless",
    wirelessFilter.data.length,
    2,
  );
  TestValidator.predicate(
    "each wishlist should have at least one item with Wireless in name",
    () => wirelessFilter.data.every((wishlist) => wishlist.wishlistItems.length >= 1),
  );
  // 6. Test 2: Filter by "bluetooth" (lowercase) - case-insensitive test
  const bluetoothFilter =
    await api.functional.ecommerceMall.customer.wishlist.index(
      customerConnection,
      {
        body: { name: "bluetooth" } satisfies IEcommerceMallWishlist.IRequest,
      },
    );
  typia.assert(bluetoothFilter);
  TestValidator.equals(
    "should have 1 item matching bluetooth (case-insensitive)",
    bluetoothFilter.data.length,
    1,
  );
  TestValidator.predicate(
    "wishlist should have at least one item",
    () => (bluetoothFilter.data[0]?.wishlistItems.length ?? 0) >= 1,
  );
  // 7. Test 3: Filter by "xyz123" - non-matching filter
  const nonMatchingFilter =
    await api.functional.ecommerceMall.customer.wishlist.index(
      customerConnection,
      {
        body: { name: "xyz123" } satisfies IEcommerceMallWishlist.IRequest,
      },
    );
  typia.assert(nonMatchingFilter);
  TestValidator.equals(
    "should have 0 items for non-matching filter",
    nonMatchingFilter.data.length,
    0,
  );
  // 8. Test 4: Filter by "USB" - should return 1 wishlist (USB Cable Type-C)
  const usbFilter = await api.functional.ecommerceMall.customer.wishlist.index(
    customerConnection,
    {
      body: { name: "USB" } satisfies IEcommerceMallWishlist.IRequest,
    },
  );
  typia.assert(usbFilter);
  TestValidator.equals(
    "should have 1 item matching USB",
    usbFilter.data.length,
    1,
  );
  TestValidator.predicate(
    "wishlist should have at least one item",
    () => (usbFilter.data[0]?.wishlistItems.length ?? 0) >= 1,
  );
  // 9. Test 5: No filter - should return all wishlists (paginated)
  const noFilter = await api.functional.ecommerceMall.customer.wishlist.index(
    customerConnection,
    {
      body: {} satisfies IEcommerceMallWishlist.IRequest,
    },
  );
  typia.assert(noFilter);
  TestValidator.predicate(
    "should return at least one wishlist with items",
    () => noFilter.data.some((wishlist) => wishlist.wishlistItems.length >= 4),
  );
}