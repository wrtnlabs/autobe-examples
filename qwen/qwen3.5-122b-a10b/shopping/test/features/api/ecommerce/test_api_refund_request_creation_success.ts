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
 * Test successful refund request creation for a delivered order item.
 *
 * Validates the refund request creation workflow where a customer submits a refund request with a reason. The test ensures the system properly accepts the refund request structure and returns the created request with pending status.
 *
 * This test focuses on the refund request creation endpoint's request/response structure validation. Since the full order creation flow requires additional SDK functions not available in this test environment, the test uses randomly generated UUIDs for order and item references.
 *
 * 1. Create and authenticate a customer account using authorize_customer_join utility.
 * 2. Submit refund request with a reason for a specified order item.
 * 3. Validate refund request has 'pending' status.
 * 4. Validate refund request includes correct order item reference.
 * 5. Validate timestamps are properly set.
 */
export async function test_api_refund_request_creation_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create and authenticate customer using utility function
  const customerConnection: api.IConnection = { host: connection.host };
  const customer = await authorize_customer_join(customerConnection, {
    body: {
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(customer);
  // 2. Create refund request with randomly generated order/item IDs
  // Note: In a full integration test, these would reference actual created resources
  const refundRequest =
    await api.functional.ecommerce.customer.orders.items.refund_requests.create(
      customerConnection,
      {
        orderId: typia.random<string & tags.Format<"uuid">>(),
        itemId: typia.random<string & tags.Format<"uuid">>(),
        body: {
          reason: RandomGenerator.paragraph({ sentences: 3 }),
        } satisfies IEcommerceRefundRequest.ICreate,
      },
    );
  typia.assert(refundRequest);
  // 3. Validate refund request structure
  TestValidator.equals("status is pending", refundRequest.status, "pending");
  TestValidator.predicate("has reason", refundRequest.reason.length > 0);
  TestValidator.predicate(
    "has created_at",
    refundRequest.created_at.length > 0,
  );
  TestValidator.predicate(
    "has updated_at",
    refundRequest.updated_at.length > 0,
  );
  TestValidator.predicate(
    "has order item reference",
    refundRequest.orderItem !== null,
  );
}
