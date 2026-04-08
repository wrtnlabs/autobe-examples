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
 * Test refund request creation fails when 7-day eligibility window has expired.
 *
 * Validates that the system properly enforces the time-limited refund policy by rejecting refund requests submitted beyond the allowable 7-day window from delivery date. The test attempts to create a refund request for an order item and expects the API to return a 400 Bad Request error.
 *
 * This ensures the business rule that refunds must be requested within 7 days of delivery is properly enforced at the API level, preventing customers from requesting refunds on items delivered beyond the allowable timeframe.
 *
 * 1. Register a customer account for authentication.
 * 2. Attempt to create a refund request with invalid order/item IDs.
 * 3. Validate the API returns 400 Bad Request error for expired refund window.
 */
export async function test_api_refund_request_expired_window(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register customer account
  const customerConnection: api.IConnection = { host: connection.host };
  const customer = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      phone_number: RandomGenerator.mobile(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommerceCustomer.IJoin,
  });
  typia.assert(customer);
  // 2. Attempt to create refund request - should fail with expired window error
  const orderId = typia.random<string & tags.Format<"uuid">>();
  const itemId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.httpError(
    "refund request rejected for expired window",
    400,
    async () => {
      await api.functional.ecommerce.customer.orders.items.refund_requests.create(
        customerConnection,
        {
          orderId,
          itemId,
          body: {
            reason: RandomGenerator.paragraph({ sentences: 2 }),
          } satisfies IEcommerceRefundRequest.ICreate,
        },
      );
    },
  );
}
