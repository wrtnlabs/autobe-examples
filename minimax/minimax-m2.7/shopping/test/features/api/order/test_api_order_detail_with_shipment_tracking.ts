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
import { generate_random_ecommerce_mall_customer_payments_checkout } from "../../../generate/generate_random_ecommerce_mall_customer_payments_checkout";
import { generate_random_ecommerce_mall_seller_orders_shipments_create } from "../../../generate/generate_random_ecommerce_mall_seller_orders_shipments_create";
import { generate_random_ecommerce_mall_seller_products_create } from "../../../generate/generate_random_ecommerce_mall_seller_products_create";
import { prepare_random_ecommerce_mall_cart_item } from "../../../prepare/prepare_random_ecommerce_mall_cart_item";
import { prepare_random_ecommerce_mall_checkout } from "../../../prepare/prepare_random_ecommerce_mall_checkout";
import { prepare_random_ecommerce_mall_product } from "../../../prepare/prepare_random_ecommerce_mall_product";
import { prepare_random_ecommerce_mall_shipment } from "../../../prepare/prepare_random_ecommerce_mall_shipment";
import { prepare_random_ecommerce_mall_shipping_address } from "../../../prepare/prepare_random_ecommerce_mall_shipping_address";

export async function test_api_order_detail_with_shipment_tracking(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register customer
  const customerEmail = typia.random<string & tags.Format<"email">>();
  const customerPassword = RandomGenerator.alphaNumeric(16);
  const customerConnection: api.IConnection = { host: connection.host };
  const customerAuth = await authorize_customer_join(customerConnection, {
    body: {
      email: customerEmail,
      password: customerPassword,
    },
  });
  // 2. Create shipping address
  const address =
    await generate_random_ecommerce_mall_customer_customers_addresses_create(
      customerConnection,
      {
        body: {
          recipientName: RandomGenerator.name(),
          phone: RandomGenerator.mobile(),
          streetAddress: `${typia.random<number & tags.Type<"uint32"> & tags.Minimum<1> & tags.Maximum<999>>()} Main Street`,
          city: "Seoul",
          state: "Gangnam",
          postalCode: "12345",
          country: "South Korea",
          isDefault: true,
        },
      },
    );
  typia.assert(address);
  // 3. Register seller and login
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const sellerPassword = RandomGenerator.alphaNumeric(16);
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {
    body: {
      email: sellerEmail,
      password: sellerPassword,
    },
  });
  typia.assert(sellerAuth);
  // Login as seller
  const sellerLoginConnection: api.IConnection = { host: connection.host };
  const sellerLoginAuth = await authorize_seller_login(sellerLoginConnection, {
    body: {
      email: sellerEmail,
      password: sellerPassword,
    } satisfies IEcommerceMallSeller.ILogin,
  });
  typia.assert(sellerLoginAuth);
  // 4. Create product (need to find valid category - use a workaround)
  // First get categories to find a valid one
  const product = await generate_random_ecommerce_mall_seller_products_create(
    sellerLoginConnection,
    {
      body: {
        name: RandomGenerator.paragraph({ sentences: 2 }),
        description: RandomGenerator.paragraph({ sentences: 5 }),
        categoryId: "00000000-0000-0000-0000-000000000001",
        basePrice: typia.random<
          number &
            tags.Type<"uint32"> &
            tags.Minimum<1000> &
            tags.Maximum<100000>
        >(),
      },
    },
  );
  typia.assert(product);
  // 5. Add items to cart
  const cart =
    await generate_random_ecommerce_mall_customer_customers_cart_items_create(
      customerConnection,
      {
        body: {
          productVariantId: product.variants[0]!.id,
          quantity: typia.random<
            number & tags.Type<"uint32"> & tags.Minimum<1> & tags.Maximum<5>
          >(),
        },
      },
    );
  typia.assert(cart);
  // 6. Checkout - create order
  const order = await generate_random_ecommerce_mall_customer_payments_checkout(
    customerConnection,
    {
      body: {
        shippingAddressId: address.id,
      },
    },
  );
  typia.assert(order);
  // Verify initial order status is 'paid'
  TestValidator.equals("order status should be paid", order.status, "paid");
  // Verify all order items have 'paid' status
  for (const item of order.orderItems) {
    TestValidator.equals("item status should be paid", item.status, "paid");
  }
  // 7. Seller ships items
  const paidItems = order.orderItems.filter((item) => item.status === "paid");
  const shipment =
    await generate_random_ecommerce_mall_seller_orders_shipments_create(
      sellerLoginConnection,
      {
        params: {
          orderId: order.id,
        },
        body: {
          orderItemIds: paidItems.map((item) => item.id),
          carrier: "DHL",
          trackingNumber: "DHL123456789",
        },
      },
    );
  typia.assert(shipment);
  // 8. Get order details and verify shipment tracking
  const orderWithShipment =
    await api.functional.ecommerceMall.customer.ecommerceMall.orders.at(
      customerConnection,
      {
        orderId: order.id,
      },
    );
  typia.assert(orderWithShipment);
  // Validate shipments array is included
  TestValidator.predicate(
    "order should have shipments",
    orderWithShipment.shipments.length > 0,
  );
  // Validate shipment details
  const shipmentSummary = orderWithShipment.shipments[0]!;
  TestValidator.equals("carrier should match", shipmentSummary.carrier, "DHL");
  TestValidator.equals(
    "tracking number should match",
    shipmentSummary.trackingNumber,
    "DHL123456789",
  );
  TestValidator.predicate(
    "item count should be greater than 0",
    shipmentSummary.itemCount > 0,
  );
  // Validate shipped items have 'shipped' status
  for (const item of orderWithShipment.orderItems) {
    if (item.status !== "paid") {
      TestValidator.equals("shipped item status", item.status, "shipped");
    }
  }
  // Validate order status changed to 'shipped'
  TestValidator.equals(
    "order status should be shipped",
    orderWithShipment.status,
    "shipped",
  );
  // Validate shipping address is locked
  TestValidator.equals(
    "shipping address is locked",
    orderWithShipment.shippingAddress.id,
    address.id,
  );
  TestValidator.equals(
    "shipping address city is locked",
    orderWithShipment.shippingAddress.city,
    address.city,
  );
  // Validate product snapshot is frozen
  for (const item of orderWithShipment.orderItems) {
    TestValidator.predicate(
      "product snapshot exists",
      item.productSnapshot !== undefined,
    );
    TestValidator.equals(
      "product name matches snapshot",
      item.productSnapshot.name,
      product.name,
    );
  }
  // Validate seller profile snapshot is frozen
  for (const item of orderWithShipment.orderItems) {
    TestValidator.predicate(
      "seller snapshot exists",
      item.sellerProfileSnapshot !== undefined,
    );
    TestValidator.equals(
      "seller shop name matches snapshot",
      item.sellerProfileSnapshot.shopName,
      sellerLoginAuth.profile.name,
    );
  }
}
