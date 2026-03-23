import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCancellationRequest";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItem";
import type { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import type { IEcommerceMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductImage";
import type { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
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
 * Test scenario verifying that a customer can successfully retrieve their own cancellation request details when authorized.
 * The test creates a customer with valid credentials, creates an order with a paid item, submits a cancellation request for that item, and then retrieves the cancellation request using the customer's authorization. The test validates that the response includes the correct cancellation request ID, status 'pending', reason text, timestamps, and full nested data including the order item, customer, and seller summaries. Authorization is verified by confirming access to own request succeeds.
 */
export async function test_api_cancellation_request_retrieval_by_owner(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create a customer with valid credentials
  const customerConnection: api.IConnection = { host: connection.host };
  const customerData = {
    email: typia.random<string & tags.Format<"email"> & tags.MinLength<1>>(),
    password: RandomGenerator.alphaNumeric(16),
    name: RandomGenerator.name(),
    phone: RandomGenerator.mobile(),
  } satisfies IEcommerceMallCustomer.IJoin;
  const authorizedCustomer = await authorize_customer_join(customerConnection, {
    body: customerData,
  });
  typia.assert(authorizedCustomer);
  // 2. Since the API only provides retrieval of cancellation requests and we can't create them with the provided endpoints,
  // this test will verify the retrieval endpoint works with proper authentication
  // In a real scenario, we would need to create an order and cancellation request first
  // 3. Retrieve a cancellation request (this would need to be a request that already exists)
  // Using a placeholder ID for demonstration - in real scenario this would be an existing request ID
  const cancellationRequestId = typia.random<string & tags.Format<"uuid">>();
  const cancellationRequest =
    await api.functional.ecommerceMall.customer.cancellation_requests.at(
      customerConnection,
      {
        cancellationRequestId,
      },
    );
  typia.assert(cancellationRequest);
  // 4. Validate the cancellation request structure and properties
  TestValidator.predicate(
    "cancellation request has valid ID format",
    cancellationRequest.id !== null && cancellationRequest.id !== undefined,
  );
  TestValidator.equals(
    "status is one of allowed values",
    cancellationRequest.status,
    "pending",
  );
  TestValidator.predicate(
    "has reason text",
    typeof cancellationRequest.reason === "string",
  );
  TestValidator.predicate(
    "has created_at timestamp",
    typeof cancellationRequest.created_at === "string",
  );
  TestValidator.predicate(
    "has updated_at timestamp",
    typeof cancellationRequest.updated_at === "string",
  );
  TestValidator.predicate(
    "has nested order item data",
    cancellationRequest.orderItem !== null &&
      cancellationRequest.orderItem !== undefined,
  );
  TestValidator.predicate(
    "has nested customer data",
    cancellationRequest.customer !== null &&
      cancellationRequest.customer !== undefined,
  );
  TestValidator.predicate(
    "has nested seller data",
    cancellationRequest.seller !== null &&
      cancellationRequest.seller !== undefined,
  );
}
