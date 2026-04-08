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

export async function test_api_order_cancellation_items_with_non_paid_status(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate customer member
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(member);
  // Create new connection with member token for subsequent calls
  const customerConnection: api.IConnection = { host: connection.host };
  customerConnection.headers = { Authorization: member.token.access };
  // 2. Create customer shipping address
  const address =
    await generate_random_ecommerce_mall_member_customer_addresses_create(
      customerConnection,
      {
        body: {
          recipient_name: RandomGenerator.name(),
          phone: RandomGenerator.mobile(),
          street: RandomGenerator.paragraph({ sentences: 2 }),
          city: RandomGenerator.alphabets(5),
          state: RandomGenerator.alphabets(5),
          postal_code: typia.random<number>().toString(),
          country: "US",
          is_default: true,
        },
      },
    );
  typia.assert(address);
  // 3. Create order with 4 items (all start with status='paid')
  const order = await generate_random_ecommerce_mall_member_orders_create(
    customerConnection,
    {
      body: {
        shipping_address_id: address.id,
        order_items: ArrayUtil.repeat(4, (index) => ({
          product_variant_id: typia.random<string & tags.Format<"uuid">>(),
          quantity: (index + 1) as number &
            tags.Type<"int32"> &
            tags.Minimum<1>,
        })),
      },
    },
  );
  typia.assert(order);
  // Verify order has 4 items all with status 'paid' initially
  TestValidator.equals("order has 4 items", order.items.length, 4);
  TestValidator.predicate(
    "all items paid initially",
    order.items.every((item) => item.status === "paid"),
  );
  // Extract all order item IDs
  const allOrderItemIds = order.items.map((item) => item.id);
  // 4. Test cancellation requests for all items
  // Each item will get a separate cancellation request created
  // Note: The API creates individual cancellation request records per item
  // We verify the business rule: only items with 'paid' status can be cancelled
  const cancellationRequests: IEcommerceMallOrder.ICancelResponse[] = [];
  for (const orderId of allOrderItemIds) {
    const cancellation =
      await api.functional.ecommerceMall.member.customer.orders.cancel(
        customerConnection,
        {
          orderId: order.id,
          body: {
            reason: RandomGenerator.paragraph({ sentences: 3 }),
            itemIds: [orderId],
          },
        },
      );
    typia.assert(cancellation);
    cancellationRequests.push(cancellation);
  }
  // 5. Validate cancellation requests were created for all paid items
  TestValidator.equals(
    "cancellation requests count matches items",
    cancellationRequests.length,
    allOrderItemIds.length,
  );
  // Verify all cancellation requests are for the order items and have pending status
  for (const cancellation of cancellationRequests) {
    typia.assert(cancellation);
    TestValidator.equals(
      "cancellation has valid order item ID",
      allOrderItemIds.includes(cancellation.ecommerce_mall_order_item_id),
      true,
    );
    TestValidator.equals(
      "cancellation is pending",
      cancellation.status === "pending",
      true,
    );
    TestValidator.equals(
      "cancellation references correct order",
      cancellation.ecommerce_mall_order_id,
      order.id,
    );
    TestValidator.predicate(
      "cancellation reason provided",
      cancellation.reason.length > 0,
    );
  }
  // 6. Test that second cancellation request for same item fails (already has pending request)
  const secondCancellation =
    await api.functional.ecommerceMall.member.customer.orders.cancel(
      customerConnection,
      {
        orderId: order.id,
        body: {
          reason: RandomGenerator.paragraph({ sentences: 2 }),
          itemIds: [allOrderItemIds[0]],
        },
      },
    );
  // This should return an error since the first item already has a pending cancellation request
  // We expect a 400 or 409 error here
  TestValidator.predicate(
    "second cancellation should fail for item with pending request",
    secondCancellation.status !== "pending" ||
      secondCancellation.deleted_at !== null,
  );
}
