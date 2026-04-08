import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCancellationRequest";
import type { IEcommerceMallCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCart";
import type { IEcommerceMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCartItem";
import type { IEcommerceMallCheckout } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCheckout";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomerProfile";
import type { IEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrder";
import type { IEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItem";
import type { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import type { IEcommerceMallProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductSnapshot";
import type { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import type { IEcommerceMallProductVariantOptionValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariantOptionValue";
import type { IEcommerceMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallRefundRequest";
import type { IEcommerceMallRefundRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallRefundRequestSnapshot";
import type { IEcommerceMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallReview";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallSellerApproval } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerApproval";
import type { IEcommerceMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfile";
import type { IEcommerceMallSellerProfileSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfileSnapshot";
import type { IEcommerceMallSellerSuspension } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerSuspension";
import type { IEcommerceMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShipment";
import type { IEcommerceMallShippingAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShippingAddress";
import type { IEcommerceMallWishlist } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallWishlist";
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
import { generate_random_ecommerce_mall_customer_customers_me_wishlist_create } from "../../../generate/generate_random_ecommerce_mall_customer_customers_me_wishlist_create";
import { prepare_random_ecommerce_mall_wishlist_item } from "../../../prepare/prepare_random_ecommerce_mall_wishlist_item";

export async function test_api_wishlist_view_with_items(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a new customer account
  const customerConnection: api.IConnection = { host: connection.host };
  const customer = await authorize_customer_join(customerConnection, {});
  // 2. Add multiple products to the customer's wishlist
  const wishlistItem1 =
    await generate_random_ecommerce_mall_customer_customers_me_wishlist_create(
      customerConnection,
      {},
    );
  typia.assert(wishlistItem1);
  const wishlistItem2 =
    await generate_random_ecommerce_mall_customer_customers_me_wishlist_create(
      customerConnection,
      {},
    );
  typia.assert(wishlistItem2);
  const wishlistItem3 =
    await generate_random_ecommerce_mall_customer_customers_me_wishlist_create(
      customerConnection,
      {},
    );
  typia.assert(wishlistItem3);
  // 3. Retrieve the customer's wishlist
  const wishlistPage =
    await api.functional.ecommerceMall.customer.customers.me.wishlist.at(
      customerConnection,
    );
  typia.assert(wishlistPage);
  // 4. Validate pagination metadata
  TestValidator.equals(
    "pagination exists",
    wishlistPage.pagination !== null,
    true,
  );
  TestValidator.equals("current page is 1", wishlistPage.pagination.current, 1);
  TestValidator.equals(
    "records count matches",
    wishlistPage.pagination.records,
    3,
  );
  TestValidator.equals("pages count is 1", wishlistPage.pagination.pages, 1);
  TestValidator.predicate("has limit", wishlistPage.pagination.limit > 0);
  // 5. Validate data array contains all added wishlist items
  TestValidator.equals("data array length", wishlistPage.data.length, 3);
  // 6. Collect added product IDs for verification
  const addedProductIds = [
    wishlistItem1.product.id,
    wishlistItem2.product.id,
    wishlistItem3.product.id,
  ];
  // 7. Validate each wishlist item structure
  for (const item of wishlistPage.data) {
    TestValidator.predicate(
      "item has valid id",
      item.id !== undefined && item.id !== null,
    );
    TestValidator.predicate("item has createdAt", item.createdAt !== undefined);
    TestValidator.predicate("product exists", item.product !== undefined);
    TestValidator.predicate("product has id", item.product.id !== undefined);
    TestValidator.predicate(
      "product has name",
      item.product.name !== undefined,
    );
    TestValidator.predicate(
      "product has basePrice",
      item.product.basePrice !== undefined,
    );
    TestValidator.predicate(
      "product has categoryName",
      item.product.categoryName !== undefined,
    );
    TestValidator.predicate(
      "product has hasStock",
      item.product.hasStock !== undefined,
    );
    TestValidator.predicate(
      "product has createdAt",
      item.product.createdAt !== undefined,
    );
    TestValidator.predicate(
      "product has updatedAt",
      item.product.updatedAt !== undefined,
    );
    TestValidator.predicate("wishlist exists", item.wishlist !== undefined);
    TestValidator.predicate("wishlist has id", item.wishlist.id !== undefined);
    TestValidator.predicate(
      "wishlist has createdAt",
      item.wishlist.createdAt !== undefined,
    );
    TestValidator.predicate(
      "wishlist has updatedAt",
      item.wishlist.updatedAt !== undefined,
    );
    TestValidator.predicate(
      "wishlist has customer",
      item.wishlist.customer !== undefined,
    );
    TestValidator.predicate(
      "customer has id",
      item.wishlist.customer.id !== undefined,
    );
    TestValidator.equals(
      "customer id matches",
      item.wishlist.customer.id,
      customer.id,
    );
  }
  // 8. Validate items are sorted by createdAt in descending order (newest first)
  for (let i = 0; i < wishlistPage.data.length - 1; i++) {
    const current = new Date(wishlistPage.data[i].createdAt).getTime();
    const next = new Date(wishlistPage.data[i + 1].createdAt).getTime();
    TestValidator.predicate(
      `item ${i} is newer than item ${i + 1}`,
      current >= next,
    );
  }
  // 9. Validate all added products are in the wishlist
  const returnedProductIds = wishlistPage.data.map((item) => item.product.id);
  for (const addedId of addedProductIds) {
    TestValidator.predicate(
      "product is in wishlist",
      returnedProductIds.includes(addedId),
    );
  }
}
