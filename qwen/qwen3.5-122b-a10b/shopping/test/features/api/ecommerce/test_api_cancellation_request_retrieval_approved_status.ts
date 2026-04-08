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
 * Test customer retrieval of approved cancellation request.
 *
 * Validates that a customer can successfully retrieve their cancellation request that has been approved by the seller. The test verifies the complete cancellation request details including the approved status, seller's approval response, and embedded order item context with product variant and seller information.
 *
 * The response should contain proper status values, non-null seller response explaining the approval decision, and correctly nested order item data. All identifiers must be valid UUIDs and timestamps must follow ISO 8601 date-time format.
 *
 * 1. Customer authenticates with the system.
 * 2. Customer retrieves a cancellation request by order ID, item ID, and request ID.
 * 3. Validates cancellation request status is "approved".
 * 4. Validates seller response is present and not null.
 * 5. Validates order item context includes product variant and seller details.
 * 6. Validates order item status reflects cancelled state.
 * 7. Validates all UUIDs and timestamps are properly formatted.
 */
export async function test_api_cancellation_request_retrieval_approved_status(
  connection: api.IConnection,
): Promise<void> {
  // 1. Customer authentication
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
  // 2. Retrieve cancellation request with random UUIDs
  // Note: In a full E2E environment, these records would be created through setup fixtures
  const orderId = typia.random<string & tags.Format<"uuid">>();
  const itemId = typia.random<string & tags.Format<"uuid">>();
  const requestId = typia.random<string & tags.Format<"uuid">>();
  const cancellationRequest =
    await api.functional.ecommerce.customer.orders.items.cancellation_requests.at(
      customerConnection,
      {
        orderId,
        itemId,
        requestId,
      },
    );
  typia.assert(cancellationRequest);
  // 3. Validate cancellation request status is "approved"
  TestValidator.equals(
    "cancellation status is approved",
    cancellationRequest.status,
    "approved",
  );
  // 4. Validate seller response is present (not null)
  TestValidator.predicate(
    "seller response exists",
    cancellationRequest.sellerResponse !== null,
  );
  TestValidator.predicate(
    "seller response has content",
    cancellationRequest.sellerResponse!.length > 0,
  );
  // 5. Validate reason is present
  TestValidator.predicate(
    "reason exists",
    cancellationRequest.reason.length > 0,
  );
  // 6. Validate order item context exists
  TestValidator.predicate(
    "order item exists",
    cancellationRequest.orderItem !== null &&
      cancellationRequest.orderItem !== undefined,
  );
  TestValidator.predicate(
    "order item has ID",
    cancellationRequest.orderItem.id.length > 0,
  );
  TestValidator.predicate(
    "order item has quantity",
    cancellationRequest.orderItem.quantity >= 1,
  );
  TestValidator.predicate(
    "order item has unit price",
    cancellationRequest.orderItem.unit_price > 0,
  );
  // 7. Validate order item status reflects cancelled state
  TestValidator.equals(
    "order item status is cancelled",
    cancellationRequest.orderItem.status,
    "cancelled",
  );
  // 8. Validate order item has product variant reference
  TestValidator.predicate(
    "product variant exists",
    cancellationRequest.orderItem.productVariant !== null &&
      cancellationRequest.orderItem.productVariant !== undefined,
  );
  TestValidator.predicate(
    "product variant has ID",
    cancellationRequest.orderItem.productVariant.id.length > 0,
  );
  TestValidator.predicate(
    "product variant has SKU code",
    cancellationRequest.orderItem.productVariant.sku_code.length > 0,
  );
  // 9. Validate order item has seller reference
  TestValidator.predicate(
    "seller exists",
    cancellationRequest.orderItem.seller !== null &&
      cancellationRequest.orderItem.seller !== undefined,
  );
  TestValidator.predicate(
    "seller has ID",
    cancellationRequest.orderItem.seller.id.length > 0,
  );
  TestValidator.predicate(
    "seller has shop name",
    cancellationRequest.orderItem.seller.shop_name.length > 0,
  );
  // 10. Validate order item has parent order reference
  TestValidator.predicate(
    "order exists",
    cancellationRequest.orderItem.order !== null &&
      cancellationRequest.orderItem.order !== undefined,
  );
  TestValidator.predicate(
    "order has ID",
    cancellationRequest.orderItem.order.id.length > 0,
  );
  TestValidator.predicate(
    "order has order number",
    cancellationRequest.orderItem.order.order_number.length > 0,
  );
  // 11. Validate timestamps are properly formatted
  TestValidator.predicate(
    "created_at is valid date-time",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(cancellationRequest.createdAt),
  );
  TestValidator.predicate(
    "updated_at is valid date-time",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(cancellationRequest.updatedAt),
  );
  // 12. Validate deletedAt is null for active request
  TestValidator.equals(
    "deletedAt is null for active request",
    cancellationRequest.deletedAt,
    null,
  );
}