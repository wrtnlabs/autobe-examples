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
import type { IEcommerceMallProductSnapshotVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductSnapshotVariant";
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
import { generate_random_ecommerce_mall_customer_customers_me_addresses_create } from "../../../generate/generate_random_ecommerce_mall_customer_customers_me_addresses_create";
import { generate_random_ecommerce_mall_customer_customers_me_cart_create } from "../../../generate/generate_random_ecommerce_mall_customer_customers_me_cart_create";
import { generate_random_ecommerce_mall_customer_customers_me_orders_create } from "../../../generate/generate_random_ecommerce_mall_customer_customers_me_orders_create";
import { prepare_random_ecommerce_mall_cart } from "../../../prepare/prepare_random_ecommerce_mall_cart";
import { prepare_random_ecommerce_mall_order } from "../../../prepare/prepare_random_ecommerce_mall_order";
import { prepare_random_ecommerce_mall_shipping_address } from "../../../prepare/prepare_random_ecommerce_mall_shipping_address";

export async function test_api_order_items_retrieval_with_snapshots(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate as customer
  const customerConnection: api.IConnection = { host: connection.host };
  const customerAuth = await authorize_customer_join(customerConnection, {});
  typia.assert(customerAuth);
  // 2. Create shipping address
  const address =
    await api.functional.ecommerceMall.customer.customers.me.addresses.create(
      customerConnection,
      {
        body: {
          recipient_name: RandomGenerator.name(),
          phone: RandomGenerator.mobile(),
          street_address: "123 Test Street",
          city: "Seoul",
          state: "Gangnam",
          postal_code: "12345",
          country: "Korea",
          is_default: true,
        } satisfies IEcommerceMallShippingAddress.ICreate,
      },
    );
  typia.assert(address);
  // 3. Create order using generation function (handles seller, product, cart creation internally)
  const order =
    await generate_random_ecommerce_mall_customer_customers_me_orders_create(
      customerConnection,
      {
        body: {
          shippingAddressId: address.id,
        } satisfies IEcommerceMallOrder.ICreate,
      },
    );
  typia.assert(order);
  // 4. Retrieve order items via GET /customer/orders/{orderId}/items
  const orderItemsList =
    await api.functional.ecommerceMall.customer.orders.items.getByOrderid(
      customerConnection,
      {
        orderId: order.id,
      },
    );
  typia.assert(orderItemsList);
  // 5. Validate order items structure
  // The response should be an array based on the endpoint description "Returns all order items"
  const items = Array.isArray(orderItemsList)
    ? orderItemsList
    : [orderItemsList];
  TestValidator.predicate("order has items", items.length > 0);
  // Validate each order item
  for (const item of items) {
    // Validate order item ID
    TestValidator.predicate(
      "item has valid id",
      item.id !== undefined && item.id !== null,
    );
    // Validate quantity
    TestValidator.predicate("quantity is positive", item.quantity > 0);
    // Validate unit price
    TestValidator.predicate("unit price is non-negative", item.unitPrice >= 0);
    // Validate line total equals quantity * unitPrice
    TestValidator.equals(
      "line total computation",
      item.lineTotal,
      item.quantity * item.unitPrice,
    );
    // Validate status is 'paid' for new order
    TestValidator.equals("status is paid", item.status, "paid");
    // Validate created_at exists
    TestValidator.predicate("created_at exists", item.createdAt !== undefined);
    // Validate product snapshot
    TestValidator.predicate(
      "product snapshot exists",
      item.productSnapshot !== undefined,
    );
    TestValidator.predicate(
      "product snapshot has name",
      item.productSnapshot.name !== undefined,
    );
    TestValidator.predicate(
      "product snapshot has description",
      item.productSnapshot.description !== undefined,
    );
    TestValidator.predicate(
      "product snapshot has basePrice",
      item.productSnapshot.basePrice !== undefined,
    );
    TestValidator.predicate(
      "product snapshot has categoryName",
      item.productSnapshot.categoryName !== undefined,
    );
    // Validate seller profile snapshot
    TestValidator.predicate(
      "seller profile snapshot exists",
      item.sellerProfileSnapshot !== undefined,
    );
    TestValidator.predicate(
      "seller profile snapshot has shopName",
      item.sellerProfileSnapshot.shopName !== undefined,
    );
    // logoUrl can be null if no logo was set
    TestValidator.predicate(
      "seller profile snapshot has logoUrl",
      "logoUrl" in item.sellerProfileSnapshot,
    );
    // Validate variant details
    TestValidator.predicate("variant exists", item.variant !== undefined);
    TestValidator.predicate(
      "variant has skuCode",
      item.variant.skuCode !== undefined,
    );
    // Validate parent order reference
    TestValidator.predicate("parent order exists", item.order !== undefined);
    TestValidator.equals("parent order id matches", item.order.id, order.id);
  }
  // Validate items are ordered by created_at ascending
  for (let i = 1; i < items.length; i++) {
    const prev = new Date(items[i - 1].createdAt).getTime();
    const curr = new Date(items[i].createdAt).getTime();
    TestValidator.predicate(
      "items ordered by created_at ascending",
      prev <= curr,
    );
  }
}
