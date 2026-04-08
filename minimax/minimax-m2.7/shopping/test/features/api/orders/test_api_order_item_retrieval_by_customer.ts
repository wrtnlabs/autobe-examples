import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCartItem";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomerProfile";
import type { IEcommerceMallInventoryRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallInventoryRecord";
import type { IEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrder";
import type { IEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItem";
import type { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import type { IEcommerceMallProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductSnapshot";
import type { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import type { IEcommerceMallProductVariantOptionValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariantOptionValue";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfile";
import type { IEcommerceMallSellerProfileSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfileSnapshot";
import type { IEcommerceMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShipment";
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
import { generate_random_ecommerce_mall_customer_customers_checkout_create } from "../../../generate/generate_random_ecommerce_mall_customer_customers_checkout_create";
import { generate_random_ecommerce_mall_seller_ecommerce_mall_variants_inventory_create } from "../../../generate/generate_random_ecommerce_mall_seller_ecommerce_mall_variants_inventory_create";
import { prepare_random_ecommerce_mall_inventory_record } from "../../../prepare/prepare_random_ecommerce_mall_inventory_record";
import { prepare_random_ecommerce_mall_order } from "../../../prepare/prepare_random_ecommerce_mall_order";
import { prepare_random_ecommerce_mall_shipping_address } from "../../../prepare/prepare_random_ecommerce_mall_shipping_address";

export async function test_api_order_item_retrieval_by_customer(
  connection: api.IConnection,
): Promise<void> {
  // 1. Customer registers and authenticates
  const customerConnection: api.IConnection = { host: connection.host };
  const customerAuth = await authorize_customer_join(customerConnection, {});
  typia.assert(customerAuth);
  // 2. Customer creates shipping address
  const address =
    await generate_random_ecommerce_mall_customer_customers_addresses_create(
      customerConnection,
      {
        body: {
          recipientName: RandomGenerator.name(),
          phone: RandomGenerator.mobile(),
          streetAddress: `${typia.random<number & tags.Type<"uint32"> & tags.Minimum<1> & tags.Maximum<999>>()} Main Street`,
          city: "Seoul",
          state: "Gangnam-gu",
          postalCode: "12345",
          country: "South Korea",
          isDefault: true,
        },
      },
    );
  typia.assert(address);
  // 3. Seller registers and authenticates
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {});
  typia.assert(sellerAuth);
  // 4. Seller logs in
  const sellerLoginConnection: api.IConnection = { host: connection.host };
  await authorize_seller_login(sellerLoginConnection, {
    body: {
      email: sellerAuth.email,
      password:
        sellerAuth.profile.description.length > 0
          ? sellerAuth.profile.description
          : "password123",
    },
  });
  // 5. Create order via checkout utility
  // Note: The checkout utility handles cart, product, and inventory internally
  const order =
    await generate_random_ecommerce_mall_customer_customers_checkout_create(
      customerConnection,
      {
        body: {},
      },
    );
  typia.assert(order);
  // Validate order was created with paid status
  TestValidator.equals("order status should be paid", order.status, "paid");
  TestValidator.predicate(
    "order should have items",
    order.orderItems.length > 0,
  );
  // 6. Get the first order item
  const orderItemId = order.orderItems[0].id;
  const orderId = order.id;
  // 7. Customer retrieves order item via GET /ecommerceMall/orders/{orderId}/items/{orderItemId}
  const orderItem = await api.functional.ecommerceMall.orders.items.at(
    customerConnection,
    {
      orderId: orderId,
      orderItemId: orderItemId,
    },
  );
  typia.assert(orderItem);
  // 8. Validate order item structure
  TestValidator.equals("order item id matches", orderItem.id, orderItemId);
  TestValidator.equals(
    "order item status should be paid",
    orderItem.status,
    "paid",
  );
  TestValidator.predicate(
    "order should be included",
    orderItem.order !== null && orderItem.order !== undefined,
  );
  TestValidator.equals("order reference matches", orderItem.order.id, orderId);
  // 9. Validate frozen product snapshot
  TestValidator.predicate(
    "product snapshot should exist",
    orderItem.productSnapshot !== null &&
      orderItem.productSnapshot !== undefined,
  );
  TestValidator.equals(
    "product snapshot id should exist",
    orderItem.productSnapshot.id !== null,
    true,
  );
  TestValidator.equals(
    "product snapshot name should exist",
    orderItem.productSnapshot.name !== null,
    true,
  );
  TestValidator.equals(
    "product snapshot basePrice should exist",
    orderItem.productSnapshot.basePrice !== null,
    true,
  );
  TestValidator.equals(
    "product snapshot categoryName should exist",
    orderItem.productSnapshot.categoryName !== null,
    true,
  );
  TestValidator.equals(
    "product snapshot createdAt should exist",
    orderItem.productSnapshot.createdAt !== null,
    true,
  );
  TestValidator.equals(
    "product snapshot seller should exist",
    orderItem.productSnapshot.seller !== null,
    true,
  );
  // 10. Validate frozen seller profile snapshot
  TestValidator.predicate(
    "seller profile snapshot should exist",
    orderItem.sellerProfileSnapshot !== null &&
      orderItem.sellerProfileSnapshot !== undefined,
  );
  TestValidator.equals(
    "seller profile snapshot id should exist",
    orderItem.sellerProfileSnapshot.id !== null,
    true,
  );
  TestValidator.equals(
    "seller profile snapshot shopName should exist",
    orderItem.sellerProfileSnapshot.shopName !== null,
    true,
  );
  TestValidator.equals(
    "seller profile snapshot createdAt should exist",
    orderItem.sellerProfileSnapshot.createdAt !== null,
    true,
  );
  TestValidator.equals(
    "seller profile snapshot sellerProfile should exist",
    orderItem.sellerProfileSnapshot.sellerProfile !== null,
    true,
  );
  // 11. Validate product variant
  TestValidator.predicate(
    "product variant should exist",
    orderItem.productVariant !== null && orderItem.productVariant !== undefined,
  );
  TestValidator.equals(
    "product variant id should exist",
    orderItem.productVariant.id !== null,
    true,
  );
  TestValidator.equals(
    "product variant sku_code should exist",
    orderItem.productVariant.sku_code !== null,
    true,
  );
  TestValidator.predicate(
    "product variant optionValues should be array",
    Array.isArray(orderItem.productVariant.optionValues),
  );
  TestValidator.predicate(
    "product variant product should exist",
    orderItem.productVariant.product !== null &&
      orderItem.productVariant.product !== undefined,
  );
  // 12. Validate quantity and unitPrice
  TestValidator.predicate(
    "quantity should be positive",
    orderItem.quantity > 0,
  );
  TestValidator.predicate(
    "unitPrice should be non-negative",
    orderItem.unitPrice >= 0,
  );
  // 13. Validate counts
  TestValidator.equals(
    "cancellationRequestsCount should be zero for new order",
    orderItem.cancellationRequestsCount,
    0,
  );
  TestValidator.equals(
    "refundRequestsCount should be zero for new order",
    orderItem.refundRequestsCount,
    0,
  );
  TestValidator.equals(
    "reviewsCount should be zero for new order",
    orderItem.reviewsCount,
    0,
  );
  // 14. Validate timestamps
  TestValidator.equals(
    "createdAt should exist",
    orderItem.createdAt !== null,
    true,
  );
  TestValidator.equals(
    "updatedAt should exist",
    orderItem.updatedAt !== null,
    true,
  );
}
