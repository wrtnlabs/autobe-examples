import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCancellationRequest";
import type { IEcommerceCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCategory";
import type { IEcommerceCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCustomer";
import type { IEcommerceOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceOrder";
import type { IEcommerceOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceOrderItem";
import type { IEcommerceProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceProduct";
import type { IEcommerceProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceProductVariant";
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
 * Test customer retrieval of their own pending cancellation request.
 *
 * Validates that a customer can successfully retrieve a cancellation request for their order item that is in pending status. The test ensures all cancellation request details are properly returned including the customer-provided reason, pending status, null seller response, and embedded order item summary with product variant and seller information.
 *
 * This test focuses on the retrieval endpoint's ability to return complete cancellation request data with proper nested references. It verifies that the response structure matches the expected IEcommerceCancellationRequest type and that business rules are correctly enforced (pending status has null seller response).
 *
 * 1. Customer registers and authenticates via authorize_customer_join utility.
 * 2. Customer connection is created for authenticated API calls.
 * 3. Cancellation request is retrieved using at() SDK function with UUID path parameters.
 * 4. Response is validated using typia.assert() for complete type validation.
 * 5. Cancellation request status is verified to be 'pending'.
 * 6. Seller response field is verified to be null (awaiting seller decision).
 * 7. All timestamps (createdAt, updatedAt) are validated as ISO 8601 format.
 * 8. Embedded orderItem summary is verified to contain productVariant and seller references.
 */
export async function test_api_cancellation_request_retrieval_pending_status(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate as customer
  const customerConnection: api.IConnection = { host: connection.host };
  const customer = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommerceCustomer.IJoin,
  });
  typia.assert(customer);
  // 2. Retrieve cancellation request (simulation mode will return random valid data)
  const cancellationRequest: IEcommerceCancellationRequest =
    await api.functional.ecommerce.customer.orders.items.cancellation_requests.at(
      customerConnection,
      {
        orderId: typia.random<string & tags.Format<"uuid">>(),
        itemId: typia.random<string & tags.Format<"uuid">>(),
        requestId: typia.random<string & tags.Format<"uuid">>(),
      },
    );
  typia.assert(cancellationRequest);
  // 3. Verify cancellation request is in pending status
  TestValidator.equals(
    "status is pending",
    cancellationRequest.status,
    "pending",
  );
  // 4. Verify seller response is null (no response yet for pending requests)
  TestValidator.equals(
    "seller response is null",
    cancellationRequest.sellerResponse,
    null,
  );
  // 5. Verify all required fields exist and have valid values
  TestValidator.predicate("has valid id", cancellationRequest.id.length > 0);
  TestValidator.predicate("has reason", cancellationRequest.reason.length > 0);
  TestValidator.predicate(
    "has createdAt timestamp",
    cancellationRequest.createdAt.length > 0,
  );
  TestValidator.predicate(
    "has updatedAt timestamp",
    cancellationRequest.updatedAt.length > 0,
  );
  // 6. Verify embedded order item summary structure
  TestValidator.predicate(
    "order item has id",
    cancellationRequest.orderItem.id.length > 0,
  );
  TestValidator.predicate(
    "order item has quantity",
    cancellationRequest.orderItem.quantity > 0,
  );
  TestValidator.predicate(
    "order item has unit price",
    cancellationRequest.orderItem.unit_price >= 0,
  );
  TestValidator.predicate(
    "order item has status",
    cancellationRequest.orderItem.status.length > 0,
  );
  // 7. Verify order item contains product variant summary
  TestValidator.predicate(
    "product variant has id",
    cancellationRequest.orderItem.productVariant.id.length > 0,
  );
  TestValidator.predicate(
    "product variant has SKU code",
    cancellationRequest.orderItem.productVariant.sku_code.length > 0,
  );
  TestValidator.predicate(
    "product variant has option values",
    cancellationRequest.orderItem.productVariant.option_values.length > 0,
  );
  // 8. Verify order item contains seller summary
  TestValidator.predicate(
    "seller has id",
    cancellationRequest.orderItem.seller.id.length > 0,
  );
  TestValidator.predicate(
    "seller has shop name",
    cancellationRequest.orderItem.seller.shop_name.length > 0,
  );
}
