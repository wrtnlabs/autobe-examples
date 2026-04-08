import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCart";
import type { IEcommerceMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCartItem";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import type { IEcommerceMallCheckout } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCheckout";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomerProfile";
import type { IEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrder";
import type { IEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItem";
import type { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import type { IEcommerceMallProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductSnapshot";
import type { IEcommerceMallProductSnapshotVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductSnapshotVariant";
import type { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import type { IEcommerceMallProductVariantOptionValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariantOptionValue";
import type { IEcommerceMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallReview";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfile";
import type { IEcommerceMallSellerProfileSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfileSnapshot";
import type { IEcommerceMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShipment";
import type { IEcommerceMallShippingAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShippingAddress";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallReview";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";
import { generate_random_ecommerce_mall_customer_customers_addresses_create } from "../../../generate/generate_random_ecommerce_mall_customer_customers_addresses_create";
import { generate_random_ecommerce_mall_customer_customers_cart_items_create } from "../../../generate/generate_random_ecommerce_mall_customer_customers_cart_items_create";
import { generate_random_ecommerce_mall_customer_orders_items_review_create } from "../../../generate/generate_random_ecommerce_mall_customer_orders_items_review_create";
import { generate_random_ecommerce_mall_customer_payments_checkout } from "../../../generate/generate_random_ecommerce_mall_customer_payments_checkout";
import { prepare_random_ecommerce_mall_cart_item } from "../../../prepare/prepare_random_ecommerce_mall_cart_item";
import { prepare_random_ecommerce_mall_checkout } from "../../../prepare/prepare_random_ecommerce_mall_checkout";
import { prepare_random_ecommerce_mall_review } from "../../../prepare/prepare_random_ecommerce_mall_review";
import { prepare_random_ecommerce_mall_shipping_address } from "../../../prepare/prepare_random_ecommerce_mall_shipping_address";

export async function test_api_review_snapshot_pagination_multiple_edits(
  connection: api.IConnection,
): Promise<void> {
  // Use simulation mode for setup to focus on snapshot pagination test
  const setupConnection: api.IConnection = {
    host: connection.host,
    simulate: true,
  };
  // 1. Customer registration and authentication
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "TestPassword123!",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommerceMallCustomer.IJoin,
  });
  // 2. Create shipping address
  const address =
    await generate_random_ecommerce_mall_customer_customers_addresses_create(
      customerConnection,
      {
        body: {
          recipientName: RandomGenerator.name(),
          phone: RandomGenerator.mobile(),
          streetAddress: `${typia.random<number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<999>>()} Main Street`,
          city: "Test City",
          state: "Test State",
          postalCode: "12345",
          country: "United States",
          isDefault: true,
        },
      },
    );
  typia.assert(address);
  // 3. Create cart with valid product variant
  const cart =
    await api.functional.ecommerceMall.customer.customers.cart.items.create(
      customerConnection,
      {
        body: {
          productVariantId: typia.random<string & tags.Format<"uuid">>(),
          quantity: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<3>
          >(),
        } satisfies IEcommerceMallCartItem.ICreate,
      },
    );
  typia.assert(cart);
  // 4. Complete checkout
  const order = await api.functional.ecommerceMall.customer.payments.checkout(
    customerConnection,
    {
      body: {
        shippingAddressId: address.id,
      } satisfies IEcommerceMallCheckout.ICreate,
    },
  );
  typia.assert(order);
  // Get first order item
  const orderItem = order.orderItems[0];
  typia.assert(orderItem);
  // 5. Create initial review (rating 3 stars)
  const review =
    await api.functional.ecommerceMall.customer.orders.items.review.create(
      customerConnection,
      {
        orderId: order.id,
        itemId: orderItem.id,
        body: {
          rating: 3,
          content: "Initial review - 3 stars",
        } satisfies IEcommerceMallReview.ICreate,
      },
    );
  typia.assert(review);
  // 6. Edit review multiple times (creating snapshots)
  // Edit 1: rating 4 stars
  const review2 =
    await api.functional.ecommerceMall.customer.orders.items.review.create(
      customerConnection,
      {
        orderId: order.id,
        itemId: orderItem.id,
        body: {
          rating: 4,
          content: "Updated review - 4 stars",
        } satisfies IEcommerceMallReview.ICreate,
      },
    );
  typia.assert(review2);
  // Edit 2: rating 5 stars
  const review3 =
    await api.functional.ecommerceMall.customer.orders.items.review.create(
      customerConnection,
      {
        orderId: order.id,
        itemId: orderItem.id,
        body: {
          rating: 5,
          content: "Updated review - 5 stars",
        } satisfies IEcommerceMallReview.ICreate,
      },
    );
  typia.assert(review3);
  // 7. Retrieve first page of snapshots (limit=2)
  const firstPage =
    await api.functional.ecommerceMall.customer.reviews.snapshots.index(
      customerConnection,
      {
        reviewId: review3.id,
        body: {
          limit: 2,
          page: 1,
        } satisfies IEcommerceMallReview.IRequest,
      },
    );
  typia.assert(firstPage);
  // Validation for first page
  TestValidator.equals("first page has 2 snapshots", firstPage.data.length, 2);
  TestValidator.equals(
    "total records should be 2",
    firstPage.pagination.records,
    2,
  );
  TestValidator.equals(
    "total pages should be 1",
    firstPage.pagination.pages,
    1,
  );
  TestValidator.equals(
    "current page should be 1",
    firstPage.pagination.current,
    1,
  );
  // Validate chronological order (oldest first)
  TestValidator.predicate(
    "first snapshot has lower timestamp",
    firstPage.data[0].createdAt <= firstPage.data[1].createdAt,
  );
  // 8. Validate snapshot data integrity
  // First snapshot: previous 3 -> new 4
  // Second snapshot: previous 4 -> new 5
  const snapshot1 = firstPage.data[0];
  const snapshot2 = firstPage.data[1];
  TestValidator.equals(
    "snapshot1 previous rating is 3",
    snapshot1.previousRating,
    3,
  );
  TestValidator.equals("snapshot1 new rating is 4", snapshot1.newRating, 4);
  TestValidator.equals(
    "snapshot2 previous rating is 4",
    snapshot2.previousRating,
    4,
  );
  TestValidator.equals("snapshot2 new rating is 5", snapshot2.newRating, 5);
  // Validate timestamps are preserved and non-null
  TestValidator.predicate(
    "snapshot1 has valid timestamp",
    snapshot1.createdAt !== null && snapshot1.createdAt !== undefined,
  );
  TestValidator.predicate(
    "snapshot2 has valid timestamp",
    snapshot2.createdAt !== null && snapshot2.createdAt !== undefined,
  );
  // Validate review IDs match
  TestValidator.equals(
    "all snapshots belong to same review",
    new Set(firstPage.data.map((s) => s.reviewId)).size,
    1,
  );
}
