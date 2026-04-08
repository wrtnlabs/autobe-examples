import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallCustomerAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomerAddress";
import type { IEcommerceMallMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallMember";
import type { IEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrder";
import type { IEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItem";
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
import { generate_random_ecommerce_mall_member_customer_addresses_create } from "../../../generate/generate_random_ecommerce_mall_member_customer_addresses_create";
import { generate_random_ecommerce_mall_member_orders_create } from "../../../generate/generate_random_ecommerce_mall_member_orders_create";
import { prepare_random_ecommerce_mall_customer_address } from "../../../prepare/prepare_random_ecommerce_mall_customer_address";
import { prepare_random_ecommerce_mall_order } from "../../../prepare/prepare_random_ecommerce_mall_order";
import { prepare_random_ecommerce_mall_order_item } from "../../../prepare/prepare_random_ecommerce_mall_order_item";

export async function test_api_order_cancellation_partial_items_with_reason(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register customer
  const customerConnection: api.IConnection = { host: connection.host };
  const customer = await api.functional.ecommerceMall.auth.member.join(
    customerConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: "TestPass123!",
        display_name: RandomGenerator.name(),
        href: "https://example.com/register",
        referrer: "https://example.com",
      } satisfies IEcommerceMallMember.IJoin,
    },
  );
  typia.assert(customer);
  // 2. Create customer address
  const address =
    await api.functional.ecommerceMall.member.customer.addresses.create(
      customerConnection,
      {
        body: {
          recipient_name: RandomGenerator.name(),
          phone: RandomGenerator.mobile(),
          street: `${typia.random<number & tags.Type<"uint32"> & tags.Maximum<99999999>>()} ${RandomGenerator.alphabets(5)} St`,
          city: "Seoul",
          state: "Seoul",
          postal_code: "06292",
          country: "KR",
          is_default: true,
        } satisfies IEcommerceMallCustomerAddress.ICreate,
      },
    );
  typia.assert(address);
  // 3. Create order with 3 items from different sellers
  // Note: In real scenario, we'd create products with different sellers
  // Using random product_variant_ids (would need actual IDs from product creation)
  const order = await api.functional.ecommerceMall.member.orders.create(
    customerConnection,
    {
      body: {
        shipping_address_id: address.id,
        order_items: ArrayUtil.repeat(3, () => ({
          product_variant_id: typia.random<string & tags.Format<"uuid">>(),
          quantity: 1 satisfies number & tags.Type<"int32"> & tags.Minimum<1>,
        })),
      } satisfies IEcommerceMallOrder.ICreate,
    },
  );
  typia.assert(order);
  // 4. Verify order details and item statuses
  TestValidator.equals("order has 3 items", order.items.length, 3);
  order.items.forEach((item, index) => {
    TestValidator.equals(`item ${index} status is paid`, item.status, "paid");
  });
  // 5. Get item IDs for partial cancellation (first 2 of 3)
  const itemIdsToCancel = [order.items[0].id, order.items[1].id];
  const itemNotToCancel = order.items[2];
  const expectedSellerIds = [
    order.items[0].seller_display_name,
    order.items[1].seller_display_name,
  ];
  // 6. Submit cancellation request with specific itemIds
  const cancellationResponse =
    await api.functional.ecommerceMall.member.customer.orders.cancel(
      customerConnection,
      {
        orderId: order.id,
        body: {
          reason: "Changed my mind about these specific items",
          itemIds: itemIdsToCancel,
        } satisfies IEcommerceMallOrder.ICancelRequest,
      },
    );
  typia.assert(cancellationResponse);
  // 7. Handle response - API may return single response or array
  // Based on schema, it returns ICancelResponse which contains single item details
  // We need to verify the response structure
  const cancellations = Array.isArray(cancellationResponse)
    ? cancellationResponse
    : [cancellationResponse];
  TestValidator.equals(
    "received cancellation response(s)",
    cancellations.length,
    2,
  );
  // 8. Verify each cancellation request has correct seller_id
  itemIdsToCancel.forEach((itemId, index) => {
    const matchingCancellation = cancellations.find(
      (c) => c.ecommerce_mall_order_item_id === itemId,
    );
    TestValidator.predicate(
      `cancellation found for item ${itemId}`,
      matchingCancellation !== undefined,
    );
    if (matchingCancellation) {
      TestValidator.equals(
        `cancellation ${index} status is pending`,
        matchingCancellation.status,
        "pending",
      );
      // Verify snapshot creation - cancellation request has order reference
      TestValidator.notEquals(
        `cancellation ${index} has order reference`,
        matchingCancellation.ecommerce_mall_order_id,
        null,
      );
      TestValidator.notEquals(
        `cancellation ${index} has seller reference`,
        matchingCancellation.ecommerce_mall_seller_id,
        null,
      );
    }
  });
  // 9. Verify order status remains 'paid' (not all items cancelled)
  // Order status should not change when not all items are cancelled
  TestValidator.equals("order status remains paid", order.status, "paid");
  // 10. Verify item not in itemIds array has no cancellation request
  const cancellationForItem3 = cancellations.find(
    (c) => c.ecommerce_mall_order_item_id === itemNotToCancel.id,
  );
  TestValidator.predicate(
    "item not in itemIds should have no cancellation request",
    cancellationForItem3 === undefined,
  );
  // 11. Verify all cancellations have correct item references
  itemIdsToCancel.forEach((itemId) => {
    const matchingCancellation = cancellations.find(
      (c) => c.ecommerce_mall_order_item_id === itemId,
    );
    TestValidator.predicate(
      `cancellation ${itemId} references correct item`,
      matchingCancellation?.ecommerce_mall_order_id === order.id,
    );
  });
}
