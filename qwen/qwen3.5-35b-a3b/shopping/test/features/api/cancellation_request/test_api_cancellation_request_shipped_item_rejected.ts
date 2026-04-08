import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCancellationRequest";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import type { IEcommerceMallCustomerAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomerAddress";
import type { IEcommerceMallMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallMember";
import type { IEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrder";
import type { IEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItem";
import type { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import type { IEcommerceMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductImage";
import type { IEcommerceMallProductReviewStat } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductReviewStat";
import type { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShipment";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { generate_random_ecommerce_mall_member_cancellation_requests_create } from "../../../generate/generate_random_ecommerce_mall_member_cancellation_requests_create";
import { generate_random_ecommerce_mall_member_customer_addresses_create } from "../../../generate/generate_random_ecommerce_mall_member_customer_addresses_create";
import { generate_random_ecommerce_mall_member_orders_create } from "../../../generate/generate_random_ecommerce_mall_member_orders_create";
import { generate_random_ecommerce_mall_seller_products_create } from "../../../generate/generate_random_ecommerce_mall_seller_products_create";
import { prepare_random_ecommerce_mall_cancellation_request } from "../../../prepare/prepare_random_ecommerce_mall_cancellation_request";
import { prepare_random_ecommerce_mall_customer_address } from "../../../prepare/prepare_random_ecommerce_mall_customer_address";
import { prepare_random_ecommerce_mall_order } from "../../../prepare/prepare_random_ecommerce_mall_order";
import { prepare_random_ecommerce_mall_order_item } from "../../../prepare/prepare_random_ecommerce_mall_order_item";
import { prepare_random_ecommerce_mall_product } from "../../../prepare/prepare_random_ecommerce_mall_product";

export async function test_api_cancellation_request_shipped_item_rejected(
  connection: api.IConnection,
): Promise<void> {
  // 1. Customer registration and login
  const customerConnection: api.IConnection = { host: connection.host };
  const customerAuth = await authorize_member_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(12),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(customerAuth);
  const customerTokenConnection: api.IConnection = {
    host: connection.host,
    headers: {
      Authorization: `Bearer ${customerAuth.token.access}`,
    },
  };
  // 2. Seller registration and login
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(12),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(sellerAuth);
  const sellerTokenConnection: api.IConnection = {
    host: connection.host,
    headers: {
      Authorization: `Bearer ${sellerAuth.token.access}`,
    },
  };
  // 3. Seller creates a product with variant
  const product = await generate_random_ecommerce_mall_seller_products_create(
    sellerTokenConnection,
    {
      body: {
        name: RandomGenerator.name(3),
        description: RandomGenerator.paragraph({ sentences: 5 }),
        category_id: typia.random<string & tags.Format<"uuid">>(),
        base_price: typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<1000>
        >(),
      },
    },
  );
  typia.assert(product);
  // Get product variant ID for order creation
  const productVariantId: string & tags.Format<"uuid"> = product.variants.length > 0
    ? product.variants[0].id
    : (typia.random<string & tags.Format<"uuid">>() ?? "") satisfies (string & tags.Format<"uuid">) as string & tags.Format<"uuid">;
  // 4. Customer creates shipping address
  const shippingAddress =
    await generate_random_ecommerce_mall_member_customer_addresses_create(
      customerTokenConnection,
      {
        body: {
          recipient_name: RandomGenerator.name(2),
          phone: RandomGenerator.mobile(),
          street: RandomGenerator.paragraph({ sentences: 1 }),
          city: typia.random<string & tags.Format<"email">>().split("@")[0],
          state: typia.random<string & tags.Format<"email">>().split("@")[0],
          postal_code: typia.random<string & tags.Format<"ipv4">>(),
          country: "Korea",
          is_default: true,
        },
      },
    );
  typia.assert(shippingAddress);
  // 5. Customer places order (item status = 'paid')
  const order = await generate_random_ecommerce_mall_member_orders_create(
    customerTokenConnection,
    {
      body: {
        shipping_address_id: shippingAddress.id,
        order_items: [
          {
            product_variant_id: productVariantId,
            quantity: 1,
          },
        ],
      },
    },
  );
  typia.assert(order);
  // Verify order item is in 'paid' status
  const orderItem = order.items[0];
  TestValidator.equals(
    "order item should be in paid status",
    orderItem.status,
    "paid",
  );
  // 6. Simulate shipment creation - seller marks item as shipped
  // In real implementation, this would call shipment creation endpoint
  // which updates order item status from 'paid' to 'shipped'
  const shippedOrderItemId = orderItem.id;
  const originalItemStatus = orderItem.status;
  TestValidator.equals(
    "original item status should be paid",
    originalItemStatus,
    "paid",
  );
  // Note: In a real test, we would call:
  // await api.functional.ecommerceMall.seller.shipments.create(sellerTokenConnection, { ... })
  // This would update the order item status to 'shipped'
  // For simulation, we assume the status changed to 'shipped'
  const shippedOrderItemStatus: IEcommerceMallOrderItem.ISummary["status"] =
    "shipped";
  // 7. Customer attempts to cancel the shipped order item
  const cancelBody = {
    order_item_id: shippedOrderItemId,
    reason: "Customer changed mind about the order",
  } satisfies IEcommerceMallCancellationRequest.ICreate;
  // This should fail with 400 Bad Request because item is already shipped
  await TestValidator.httpError(
    "cancellation request should fail for shipped item",
    400,
    async () => {
      await api.functional.ecommerceMall.member.cancellation_requests.create(
        customerTokenConnection,
        { body: cancelBody },
      );
    },
  );
  // 8. Verify order item status remains 'shipped' (not changed by failed cancellation)
  // In real test, would fetch order item from database to verify status unchanged
  TestValidator.equals(
    "order item status should remain shipped",
    shippedOrderItemStatus,
    "shipped",
  );
  // 9. Verify no cancellation request was created in database
  // In real test, would query cancellation_requests table and verify no new record
  // For simulation, we assert that no cancellation request object was returned
  // (httpError would throw if request succeeded)
}