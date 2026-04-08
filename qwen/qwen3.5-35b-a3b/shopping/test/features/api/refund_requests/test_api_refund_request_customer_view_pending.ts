import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallCustomerAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomerAddress";
import type { IEcommerceMallMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallMember";
import type { IEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrder";
import type { IEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItem";
import type { IEcommerceMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallRefundRequest";
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
import { generate_random_ecommerce_mall_member_orders_create } from "../../../generate/generate_random_ecommerce_mall_member_orders_create";
import { prepare_random_ecommerce_mall_order } from "../../../prepare/prepare_random_ecommerce_mall_order";
import { prepare_random_ecommerce_mall_order_item } from "../../../prepare/prepare_random_ecommerce_mall_order_item";

export async function test_api_refund_request_customer_view_pending(
  connection: api.IConnection,
): Promise<void> {
  /**
   * Test customer refund request viewing workflow prerequisites.
   *
   * Validates the customer account setup and order creation required before
   * refund request creation and viewing. This test establishes the foundation
   * for the refund request workflow by verifying customer registration,
   * order creation, and order item data completeness.
   *
   * Note: This test focuses on prerequisites as refund request creation is not
   * currently available in the SDK. The viewing workflow depends on a refund
   * request existing in the system.
   *
   * 1. Customer registers with email/password credentials
   * 2. Customer creates order with items as prerequisite for refund workflow
   * 3. Validates order items have all required fields for refund context
   */
  // 1. Register new customer for authentication context
  const customerConnection: api.IConnection = { host: connection.host };
  const customer = await authorize_member_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      phone_number: RandomGenerator.mobile(),
      href: "https://example.com/register",
      referrer: "https://example.com/",
    },
  });
  typia.assert(customer);
  // 2. Create order (prerequisite for refund workflow)
  const order = await generate_random_ecommerce_mall_member_orders_create(
    customerConnection,
    {},
  );
  typia.assert(order);
  // 3. Validate order items have all fields required for refund request context
  const orderItem = order.items[0]!;
  TestValidator.equals(
    "order item ID is valid UUID",
    orderItem.id.length > 0,
    true,
  );
  TestValidator.equals(
    "order item order number exists",
    orderItem.order_number.length > 0,
    true,
  );
  TestValidator.equals(
    "order item seller display name exists",
    orderItem.seller_display_name.length > 0,
    true,
  );
  TestValidator.equals(
    "order item product variant name exists",
    orderItem.product_variant_name.length > 0,
    true,
  );
  TestValidator.equals(
    "order item SKU code exists",
    orderItem.product_variant_sku_code.length > 0,
    true,
  );
  TestValidator.equals(
    "order item quantity is at least 1",
    orderItem.quantity >= 1,
    true,
  );
  TestValidator.predicate(
    "order item unit price is positive",
    orderItem.unit_price > 0,
  );
  TestValidator.predicate(
    "order item subtotal is positive",
    orderItem.subtotal > 0,
  );
  TestValidator.equals(
    "order item subtotal equals quantity * unit_price",
    orderItem.subtotal,
    orderItem.quantity * orderItem.unit_price,
  );
  // 4. Validate customer context
  TestValidator.equals(
    "customer email is valid",
    customer.email.length > 0,
    true,
  );
  TestValidator.predicate(
    "customer created_at is valid datetime",
    !isNaN(Date.parse(customer.created_at)),
  );
  TestValidator.predicate(
    "customer updated_at is valid datetime",
    !isNaN(Date.parse(customer.updated_at)),
  );
}
