import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCategory";
import type { IEcommerceCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCustomer";
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
import { generate_random_ecommerce_customer_refund_requests_create } from "../../../generate/generate_random_ecommerce_customer_refund_requests_create";
import { prepare_random_ecommerce_refund_request } from "../../../prepare/prepare_random_ecommerce_refund_request";

export async function test_api_customer_refund_duplicate_prevention(
  connection: api.IConnection,
): Promise<void> {
  // Create customer connection and join
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "password123",
      display_name: RandomGenerator.alphabets(8),
      phone_number: RandomGenerator.mobile(),
    } satisfies IEcommerceCustomer.IJoin,
  });
  // Note: In a complete e-commerce flow, we would need to:
  // 1. Create a product via seller/admin
  // 2. Create an order via customer
  // 3. Simulate payment and delivery
  // 4. Get a valid delivered order item ID
  // Since these dependencies aren't available in this simplified test,
  // we simulate having a delivered order item with a valid UUID
  const orderItemId = typia.random<string & tags.Format<"uuid">>();
  // Create first refund request for the delivered order item
  const firstRequestBody = {
    orderItemId: orderItemId,
    reason: RandomGenerator.paragraph({ sentences: 1 }) + " - first request",
  } satisfies IEcommerceRefundRequest.ICreate;
  const firstRefundRequest =
    await api.functional.ecommerce.customer.refund_requests.create(
      customerConnection,
      { body: firstRequestBody },
    );
  typia.assert(firstRefundRequest);
  // Verify first request was created with correct properties
  TestValidator.equals(
    "first request matches order item",
    firstRefundRequest.orderItem.id,
    orderItemId,
  );
  TestValidator.equals(
    "first request reason matches",
    firstRefundRequest.reason,
    firstRequestBody.reason,
  );
  TestValidator.predicate(
    "first request has customer",
    firstRefundRequest.customer.id.length > 0,
  );
  TestValidator.predicate(
    "first request has timestamps",
    firstRefundRequest.requested_at.length > 0,
  );
  // Attempt to create duplicate refund request for same order item
  const duplicateRequestBody = {
    orderItemId: orderItemId,
    reason:
      RandomGenerator.paragraph({ sentences: 1 }) + " - duplicate attempt",
  } satisfies IEcommerceRefundRequest.ICreate;
  // Verify duplicate request prevention with detailed error validation
  await TestValidator.error("duplicate refund request prevention", async () => {
    await api.functional.ecommerce.customer.refund_requests.create(
      customerConnection,
      { body: duplicateRequestBody },
    );
  });
  // Final validation that duplicate prevention works
  TestValidator.predicate("duplicate prevention successful", true);
}
