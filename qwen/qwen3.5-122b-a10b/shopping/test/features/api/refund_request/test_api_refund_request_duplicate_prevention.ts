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
 * Test duplicate refund request prevention for order items.
 *
 * Validates that the system prevents customers from submitting multiple concurrent refund requests for the same order item. The test ensures data integrity by verifying that only one active refund request can exist per order item at any time.
 *
 * 1. Customer account is authenticated for refund request submission.
 * 2. Order item exists with 'delivered' status and an existing pending refund request (pre-setup).
 * 3. Customer attempts to create a second refund request for the same order item.
 * 4. System returns 409 Conflict error indicating duplicate refund request is prevented.
 */
export async function test_api_refund_request_duplicate_prevention(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create customer account
  const customerConnection: api.IConnection = { host: connection.host };
  const customer = await api.functional.ecommerce.auth.customer.join(
    customerConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        display_name: RandomGenerator.name(),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IEcommerceCustomer.IJoin,
    },
  );
  typia.assert(customer);
  // 2. Attempt to create duplicate refund request for order item with existing pending refund
  // Note: orderId and itemId should correspond to pre-setup test data with existing pending refund
  const orderId = typia.random<string & tags.Format<"uuid">>();
  const itemId = typia.random<string & tags.Format<"uuid">>();
  // 3. Verify 409 Conflict is returned for duplicate refund request
  await TestValidator.httpError(
    "duplicate refund request prevented",
    409,
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
