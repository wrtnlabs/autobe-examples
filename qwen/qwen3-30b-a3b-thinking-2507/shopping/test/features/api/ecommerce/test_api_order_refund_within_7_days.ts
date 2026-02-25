import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCategory";
import type { IEcommerceCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCustomer";
import type { IEcommerceCustomerAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCustomerAddress";
import type { IEcommerceOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceOrder";
import type { IEcommerceOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceOrderItem";
import type { IEcommerceProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceProduct";
import type { IEcommerceProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceProductVariant";
import type { IEcommerceRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceRefundRequest";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceOrder";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";
import { generate_random_ecommerce_customer_orders_refund_requests_create } from "../../../generate/generate_random_ecommerce_customer_orders_refund_requests_create";
import { prepare_random_ecommerce_refund_request } from "../../../prepare/prepare_random_ecommerce_refund_request";

export async function test_api_order_refund_within_7_days(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create and authenticate as customer
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(12),
      href: RandomGenerator.paragraph({ sentences: 1 }) satisfies string &
        tags.Format<"uri">,
      referrer: RandomGenerator.paragraph({ sentences: 1 }) satisfies string &
        tags.Format<"uri">,
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  // 2. Retrieve customer orders
  const ordersPage = await api.functional.ecommerce.customer.orders.index(
    customerConnection,
    {
      body: { status: "delivered" } satisfies IEcommerceOrder.IRequest,
    },
  );
  typia.assert(ordersPage);
  // 3. Find a delivered order item (first one for simplicity)
  const deliveredOrder =
    ordersPage.data[0] ??
    (await TestValidator.error("no delivered orders available", async () => {
      await api.functional.ecommerce.customer.orders.index(customerConnection, {
        body: { status: "delivered" } satisfies IEcommerceOrder.IRequest,
      });
    }));
  // 4. Verify delivery date is within 7 days
  const deliveryDate = new Date(deliveredOrder.created_at);
  const today = new Date();
  const daysSinceDelivery =
    (today.getTime() - deliveryDate.getTime()) / (1000 * 60 * 60 * 24);
  if (daysSinceDelivery > 7) {
    throw new Error(
      `Delivery date too old (${daysSinceDelivery.toFixed(1)} days)`,
    );
  }
  // 5. Initiate refund request
  const refundRequest =
    await generate_random_ecommerce_customer_orders_refund_requests_create(
      customerConnection,
      {
        body: {
          reason: RandomGenerator.paragraph({ sentences: 2 }),
        },
        params: {
          id: deliveredOrder.id,
        },
      },
    );
  typia.assert(refundRequest);
  // 6. Validate refund request
  TestValidator.equals("refund status", refundRequest.status, "pending");
  TestValidator.equals(
    "refund ID matches order item ID",
    refundRequest.id,
    deliveredOrder.id,
  );
  TestValidator.predicate("refund within 7 days", daysSinceDelivery <= 7);
  TestValidator.equals(
    "delivery date matches",
    deliveryDate.toISOString().split("T")[0],
    new Date(refundRequest.created_at).toISOString().split("T")[0],
  );
  TestValidator.predicate(
    "refund reason is non-empty",
    refundRequest.reason.length > 0,
  );
}
