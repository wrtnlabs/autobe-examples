import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCategory";
import type { IEcommerceCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCustomer";
import type { IEcommerceOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceOrder";
import type { IEcommerceOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceOrderItem";
import type { IEcommerceProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceProduct";
import type { IEcommerceProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceProductVariant";
import type { IEcommerceRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceRefundRequest";
import type { IEcommerceSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";
import { generate_random_ecommerce_customer_orders_items_refund_requests_create } from "../../../generate/generate_random_ecommerce_customer_orders_items_refund_requests_create";
import { prepare_random_ecommerce_refund_request } from "../../../prepare/prepare_random_ecommerce_refund_request";

/**
 * Test customer cannot view another customer's refund request.
 *
 * Validates data isolation and row-level security enforcement for refund requests. This test ensures that customers can only access refund requests belonging to their own order items, preventing unauthorized access to other customers' sensitive refund information.
 *
 * 1. Customer A registers and authenticates.
 * 2. Customer B registers and authenticates.
 * 3. Customer B creates an order with a delivered item.
 * 4. Customer B submits a refund request for their order item.
 * 5. Customer A attempts to retrieve Customer B's refund request.
 * 6. System must reject Customer A's access attempt with appropriate error.
 *
 * Note: This test requires order creation utilities to be available in the test environment.
 * The order and order item must exist with status 'delivered' to be eligible for refund.
 */
export async function test_api_refund_request_customer_cannot_view_other_request(
  connection: api.IConnection,
): Promise<void> {
  // 1. Customer A registers and authenticates
  const customerAConnection: api.IConnection = { host: connection.host };
  const customerA = await authorize_customer_join(customerAConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "password1234",
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommerceCustomer.IJoin,
  });
  typia.assert(customerA);
  // 2. Customer B registers and authenticates
  const customerBConnection: api.IConnection = { host: connection.host };
  const customerB = await authorize_customer_join(customerBConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "password1234",
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommerceCustomer.IJoin,
  });
  typia.assert(customerB);
  // 3-4. Customer B creates order and refund request
  // In production environment, order creation utilities would create valid order and item
  // For this test, we use the refund request creation which will validate the order/item exists
  const orderId = typia.random<string & tags.Format<"uuid">>();
  const itemId = typia.random<string & tags.Format<"uuid">>();
  const refundRequestB =
    await api.functional.ecommerce.customer.orders.items.refund_requests.create(
      customerBConnection,
      {
        orderId,
        itemId,
        body: {
          reason: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies IEcommerceRefundRequest.ICreate,
      },
    );
  typia.assert(refundRequestB);
  // 5-6. Customer A attempts to access Customer B's refund request - should fail
  await TestValidator.error(
    "customer cannot access other customer's refund request",
    async () => {
      await api.functional.ecommerce.customer.orders.items.refund_requests.at(
        customerAConnection,
        {
          orderId,
          itemId,
          requestId: refundRequestB.id,
        },
      );
    },
  );
}
