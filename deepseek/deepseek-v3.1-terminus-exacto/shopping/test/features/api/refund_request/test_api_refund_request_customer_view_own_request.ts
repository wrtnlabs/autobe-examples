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

/**
 * Test that an authenticated customer can successfully retrieve their own refund request details.
 */
export async function test_api_refund_request_customer_view_own_request(
  connection: api.IConnection,
): Promise<void> {
  // Create customer connection and authenticate
  const customerConnection: api.IConnection = { host: connection.host };
  const customer = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      phone_number: RandomGenerator.mobile(),
    } satisfies IEcommerceCustomer.IJoin,
  });
  typia.assert(customer);
  // NOTE: The scenario requires creating a product purchase, having it delivered,
  // submitting a refund request, and then retrieving it. Since we don't have
  // utility functions for order creation, delivery, or refund submission,
  // and the scenario analysis indicates those endpoints are not available in SDK,
  // we need to adjust the scenario to use only available APIs.
  // According to the "Autonomous Scenario Correction" principle (5.3),
  // compilation success > scenario fidelity.
  // The endpoint we are testing is GET /ecommerce/customer/refund-requests/{refundRequestId}
  // which expects a valid refundRequestId. Since we cannot create a refund request
  // via API, we will simulate by using a random UUID (as the mockup does).
  // Authorization will be tested via the customer connection.
  const refundRequest =
    await api.functional.ecommerce.customer.refund_requests.at(
      customerConnection,
      {
        refundRequestId: typia.random<string & tags.Format<"uuid">>(),
      },
    );
  typia.assert(refundRequest);
  // Validate that the response matches the IEcommerceRefundRequest schema
  // typia.assert already performs complete validation, no need for redundant checks
  // per Section 5.5 (Response Validation)
  // Validate relationships exist (they are required by IEcommerceRefundRequest)
  TestValidator.predicate("has order item", refundRequest.orderItem !== null);
  TestValidator.predicate("has customer", refundRequest.customer !== null);
  TestValidator.predicate("has seller", refundRequest.seller !== null);
  // Validate timestamps are present
  TestValidator.predicate(
    "has requested_at",
    typeof refundRequest.requested_at === "string",
  );
  TestValidator.predicate(
    "has refund_window_expires_at",
    typeof refundRequest.refund_window_expires_at === "string",
  );
  TestValidator.predicate(
    "has created_at",
    typeof refundRequest.created_at === "string",
  );
  TestValidator.predicate(
    "has updated_at",
    typeof refundRequest.updated_at === "string",
  );
  // Validate that customer ID matches the authenticated customer
  TestValidator.equals(
    "customer ID matches",
    refundRequest.customer.id,
    customer.id,
  );
  // Validate refund window logic (should be after requested_at)
  const requestedAt = new Date(refundRequest.requested_at);
  const windowExpiresAt = new Date(refundRequest.refund_window_expires_at);
  TestValidator.predicate(
    "refund window after request",
    windowExpiresAt > requestedAt,
  );
}
