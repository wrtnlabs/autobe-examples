import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMall } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMall";
import type { IEcommerceMallCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCart";
import type { IEcommerceMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCartItem";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import type { IEcommerceMallCheckout } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCheckout";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomerProfile";
import type { IEcommerceMallInventoryRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallInventoryRecord";
import type { IEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrder";
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
import type { IEcommerceMallSellerProfileSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfileSnapshot";
import type { IEcommerceMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShipment";
import type { IEcommerceMallShipmentItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShipmentItem";
import type { IEcommerceMallShippingAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShippingAddress";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMall } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMall";
import type { IPageIEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallOrderItem";
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
import { generate_random_ecommerce_mall_customer_customers_addresses_create } from "../../../generate/generate_random_ecommerce_mall_customer_customers_addresses_create";
import { generate_random_ecommerce_mall_customer_customers_cart_items_create } from "../../../generate/generate_random_ecommerce_mall_customer_customers_cart_items_create";
import { generate_random_ecommerce_mall_customer_orders_items_review_create } from "../../../generate/generate_random_ecommerce_mall_customer_orders_items_review_create";
import { generate_random_ecommerce_mall_customer_payments_checkout } from "../../../generate/generate_random_ecommerce_mall_customer_payments_checkout";
import { generate_random_ecommerce_mall_seller_orders_shipments_create } from "../../../generate/generate_random_ecommerce_mall_seller_orders_shipments_create";
import { generate_random_ecommerce_mall_seller_product_variants_inventory_records_create } from "../../../generate/generate_random_ecommerce_mall_seller_product_variants_inventory_records_create";
import { generate_random_ecommerce_mall_seller_products_create } from "../../../generate/generate_random_ecommerce_mall_seller_products_create";
import { prepare_random_ecommerce_mall_cart_item } from "../../../prepare/prepare_random_ecommerce_mall_cart_item";
import { prepare_random_ecommerce_mall_checkout } from "../../../prepare/prepare_random_ecommerce_mall_checkout";
import { prepare_random_ecommerce_mall_inventory_record } from "../../../prepare/prepare_random_ecommerce_mall_inventory_record";
import { prepare_random_ecommerce_mall_product } from "../../../prepare/prepare_random_ecommerce_mall_product";
import { prepare_random_ecommerce_mall_review } from "../../../prepare/prepare_random_ecommerce_mall_review";
import { prepare_random_ecommerce_mall_shipment } from "../../../prepare/prepare_random_ecommerce_mall_shipment";
import { prepare_random_ecommerce_mall_shipping_address } from "../../../prepare/prepare_random_ecommerce_mall_shipping_address";

export async function test_api_review_snapshots_preserved_after_updates(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create seller account and login
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {});
  typia.assert(sellerAuth);
  const sellerPassword = RandomGenerator.alphaNumeric(16);
  const sellerLoginConnection: api.IConnection = { host: connection.host };
  await authorize_seller_login(sellerLoginConnection, {
    body: {
      email: sellerAuth.email,
      password: sellerPassword,
    } satisfies IEcommerceMallSeller.ILogin,
  });
  // 2. Create product with variants
  const product = await generate_random_ecommerce_mall_seller_products_create(
    sellerLoginConnection,
    {},
  );
  typia.assert(product);
  // Get first variant
  const variant = product.variants[0];
  const variantId = variant.id;
  // 3. Add inventory to variant
  await generate_random_ecommerce_mall_seller_product_variants_inventory_records_create(
    sellerLoginConnection,
    {
      body: {
        quantity: typia.random<number & tags.Type<"int32"> & tags.Minimum<1>>(),
        operationType: "restock" as const,
        reason: "Initial stock",
      },
      params: { variantId },
    },
  );
  // 4. Create customer account and login
  const customerConnection: api.IConnection = { host: connection.host };
  const customerAuth = await authorize_customer_join(customerConnection, {});
  typia.assert(customerAuth);
  const customerPassword = RandomGenerator.alphaNumeric(16);
  const customerLoginConnection: api.IConnection = { host: connection.host };
  await authorize_customer_login(customerLoginConnection, {
    body: {
      email: customerAuth.email,
      password: customerPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommerceMallCustomer.ILogin,
  });
  // 5. Create shipping address
  const address =
    await generate_random_ecommerce_mall_customer_customers_addresses_create(
      customerLoginConnection,
      {
        body: {
          recipientName: RandomGenerator.name(),
          phone: RandomGenerator.mobile(),
          streetAddress: RandomGenerator.paragraph({ sentences: 1 }),
          city: RandomGenerator.name(1),
          state: RandomGenerator.name(1),
          postalCode: "12345",
          country: "Korea",
          isDefault: true,
        } satisfies IEcommerceMallShippingAddress.ICreate,
      },
    );
  typia.assert(address);
  // 6. Add item to cart
  const cart =
    await generate_random_ecommerce_mall_customer_customers_cart_items_create(
      customerLoginConnection,
      {
        body: {
          productVariantId: variantId,
          quantity: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1>
          >(),
        } satisfies IEcommerceMallCartItem.ICreate,
      },
    );
  typia.assert(cart);
  // 7. Checkout
  const order = await generate_random_ecommerce_mall_customer_payments_checkout(
    customerLoginConnection,
    {
      body: {
        shippingAddressId: address.id,
      } satisfies IEcommerceMallCheckout.ICreate,
    },
  );
  typia.assert(order);
  // 8. Seller ships order
  const orderItem = order.orderItems[0];
  await generate_random_ecommerce_mall_seller_orders_shipments_create(
    sellerLoginConnection,
    {
      body: {
        orderItemIds: [orderItem.id],
        carrier: RandomGenerator.name(1),
        trackingNumber: RandomGenerator.alphaNumeric(10),
      } satisfies IEcommerceMallShipment.ICreate,
      params: { orderId: order.id },
    },
  );
  // 9. Customer confirms delivery - call items index with delivered status to trigger confirmation
  const deliveredItems =
    await api.functional.ecommerceMall.customer.ecommerceMall.orders.items.index(
      customerLoginConnection,
      {
        orderId: order.id,
        body: {} satisfies IEcommerceMallOrderItem.IRequest,
      },
    );
  typia.assert(deliveredItems);
  // 10. Create initial review with rating 3
  const initialReview =
    await generate_random_ecommerce_mall_customer_orders_items_review_create(
      customerLoginConnection,
      {
        body: {
          rating: 3 as number &
            tags.Type<"int32"> &
            tags.Minimum<1> &
            tags.Maximum<5>,
          content: "Good product",
        } satisfies IEcommerceMallReview.ICreate,
        params: {
          orderId: order.id,
          itemId: orderItem.id,
        },
      },
    );
  typia.assert(initialReview);
  // 11. Update review - first update (rating 4)
  const firstUpdate =
    await api.functional.ecommerceMall.customer.reviews.update(
      customerLoginConnection,
      {
        reviewId: initialReview.id,
        body: {
          rating: 4 as number &
            tags.Type<"int32"> &
            tags.Minimum<1> &
            tags.Maximum<5>,
          content: "Very good product",
        } satisfies IEcommerceMallReview.IUpdate,
      },
    );
  typia.assert(firstUpdate);
  // 12. Update review - second update (rating 5)
  const secondUpdate =
    await api.functional.ecommerceMall.customer.reviews.update(
      customerLoginConnection,
      {
        reviewId: initialReview.id,
        body: {
          rating: 5 as number &
            tags.Type<"int32"> &
            tags.Minimum<1> &
            tags.Maximum<5>,
          content: "Excellent product!",
        } satisfies IEcommerceMallReview.IUpdate,
      },
    );
  typia.assert(secondUpdate);
  // 13. Validate current review shows latest values
  TestValidator.equals("Current rating is 5", secondUpdate.rating, 5);
  TestValidator.equals(
    "Current content is 'Excellent product!'",
    secondUpdate.content,
    "Excellent product!",
  );
  // 14. Validate snapshots are preserved
  // The review response includes reviewSnapshots array from IEcommerceMallReview
  const snapshots = secondUpdate.reviewSnapshots;
  // Should have 2 snapshots (from 2 updates)
  TestValidator.equals("Has 2 snapshots", snapshots.length, 2);
  // Find first snapshot (rating 3 -> rating 4)
  const firstSnapshot = snapshots.find(
    (s) => s.previousRating === 3 && s.newRating === 4,
  );
  TestValidator.predicate("First snapshot exists", firstSnapshot !== undefined);
  if (firstSnapshot) {
    TestValidator.equals(
      "First snapshot previousContent is 'Good product'",
      firstSnapshot.previousContent,
      "Good product",
    );
    TestValidator.equals(
      "First snapshot newContent is 'Very good product'",
      firstSnapshot.newContent,
      "Very good product",
    );
  }
  // Find second snapshot (rating 4 -> rating 5)
  const secondSnapshot = snapshots.find(
    (s) => s.previousRating === 4 && s.newRating === 5,
  );
  TestValidator.predicate(
    "Second snapshot exists",
    secondSnapshot !== undefined,
  );
  if (secondSnapshot) {
    TestValidator.equals(
      "Second snapshot previousContent is 'Very good product'",
      secondSnapshot.previousContent,
      "Very good product",
    );
    TestValidator.equals(
      "Second snapshot newContent is 'Excellent product!'",
      secondSnapshot.newContent,
      "Excellent product!",
    );
  }
  // Validate snapshots have different createdAt timestamps
  if (firstSnapshot && secondSnapshot) {
    TestValidator.predicate(
      "Snapshots have different timestamps",
      firstSnapshot.createdAt !== secondSnapshot.createdAt,
    );
  }
}
