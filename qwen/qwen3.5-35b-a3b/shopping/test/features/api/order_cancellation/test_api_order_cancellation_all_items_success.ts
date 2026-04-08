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

export async function test_api_order_cancellation_all_items_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Customer authentication
  const memberConnection: api.IConnection = { host: connection.host };
  const member: IEcommerceMallMember.IAuthorized = await authorize_member_join(
    memberConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        display_name: RandomGenerator.name(),
        phone_number: RandomGenerator.mobile(),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      },
    },
  );
  typia.assert(member);
  // 2. Create customer address
  const address: IEcommerceMallCustomerAddress =
    await generate_random_ecommerce_mall_member_customer_addresses_create(
      memberConnection,
      {
        body: {
          recipient_name: RandomGenerator.name(),
          phone: RandomGenerator.mobile(),
          street: RandomGenerator.paragraph({ sentences: 3 }),
          city: RandomGenerator.alphabets(6),
          state: RandomGenerator.alphabets(6),
          postal_code: typia.random<string & tags.Format<"uuid">>(),
          country: "South Korea",
          is_default: true,
        },
      },
    );
  typia.assert(address);
  // 3. Create order with multiple items (2 items for testing cancellation)
  const order: IEcommerceMallOrder =
    await generate_random_ecommerce_mall_member_orders_create(
      memberConnection,
      {
        body: {
          shipping_address_id: address.id,
          order_items: ArrayUtil.repeat(2, () => ({
            product_variant_id: typia.random<string & tags.Format<"uuid">>(),
            quantity: typia.random<
              number & tags.Type<"int32"> & tags.Minimum<1>
            >(),
          })),
        },
      },
    );
  typia.assert(order);
  // 4. Verify all order items have status 'paid'
  TestValidator.equals("order has at least 2 items", order.items.length, 2);
  for (const item of order.items) {
    typia.assert(item);
    TestValidator.equals(`item ${item.id} status is paid`, item.status, "paid");
  }
  // 5. Submit cancellation request for ALL items (itemIds omitted = all items)
  const cancellationRequest: IEcommerceMallOrder.ICancelResponse =
    await api.functional.ecommerceMall.member.customer.orders.cancel(
      memberConnection,
      {
        orderId: order.id,
        body: {
          reason: RandomGenerator.paragraph({ sentences: 2 }),
        },
      },
    );
  typia.assert(cancellationRequest);
  // 6. Verify cancellation request has status 'pending'
  TestValidator.equals(
    "cancellation request status is pending",
    cancellationRequest.status,
    "pending",
  );
  // 7. Verify cancellation request has required fields
  TestValidator.predicate(
    "cancellation request reason is non-empty",
    () => cancellationRequest.reason.length > 0,
  );
  TestValidator.notEquals(
    "cancellation request has valid id",
    cancellationRequest.id,
    "",
  );
  TestValidator.notEquals(
    "cancellation request has created_at",
    cancellationRequest.created_at,
    "",
  );
  TestValidator.notEquals(
    "cancellation request has updated_at",
    cancellationRequest.updated_at,
    "",
  );
  TestValidator.equals(
    "cancellation request links to correct order",
    cancellationRequest.ecommerce_mall_order_id,
    order.id,
  );
  // 8. Verify linked order item still has status 'paid' (awaiting seller approval)
  typia.assert(cancellationRequest.item);
  TestValidator.equals(
    "order item status remains paid (awaiting seller approval)",
    cancellationRequest.item.status,
    "paid",
  );
  // 9. Verify linked order summary
  typia.assert(cancellationRequest.order);
  TestValidator.equals(
    "cancellation request links to correct order number",
    cancellationRequest.order.order_number,
    order.order_number,
  );
  // 10. Verify linked seller
  typia.assert(cancellationRequest.seller);
  TestValidator.notEquals(
    "cancellation request has seller reference",
    cancellationRequest.seller.id,
    "",
  );
  // Business rule verification: cancellation creates pending request (not immediate cancellation)
  TestValidator.predicate(
    "cancellation request has pending status (not cancelled/refunded)",
    () => cancellationRequest.status === "pending",
  );
}
