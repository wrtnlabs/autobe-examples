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
import type { IEcommerceSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSellerProfile";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";

/**
 * Test seller retrieval of a rejected cancellation request.
 *
 * Validates that a seller can successfully retrieve a cancellation request for their product that has been rejected. The test ensures all relevant fields are properly populated including the customer's reason, rejection status, seller's response text, and timestamps reflecting the rejection decision.
 *
 * This test verifies the complete cancellation request lifecycle where a customer submits a cancellation request, the seller reviews and rejects it, and the seller can subsequently retrieve the rejected request with full details.
 *
 * 1. Authenticate as a seller via join endpoint.
 * 2. Generate UUID identifiers for order, order item, and cancellation request.
 * 3. Retrieve the cancellation request using seller endpoint.
 * 4. Validate the cancellation reason is present.
 * 5. Validate the status equals 'rejected'.
 * 6. Validate the sellerResponse contains rejection text.
 * 7. Validate the order item reference exists with product and seller details.
 * 8. Validate timestamps are properly formatted.
 */
export async function test_api_seller_cancellation_request_retrieval_rejected(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as seller
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommerceSeller.IJoin,
  });
  typia.assert(sellerAuth);
  // 2. Generate UUID identifiers for the cancellation request hierarchy
  const orderId = typia.random<string & tags.Format<"uuid">>();
  const itemId = typia.random<string & tags.Format<"uuid">>();
  const requestId = typia.random<string & tags.Format<"uuid">>();
  // 3. Retrieve the cancellation request using seller endpoint
  const cancellationRequest =
    await api.functional.ecommerce.seller.orders.items.cancellation_requests.at(
      sellerConnection,
      {
        orderId,
        itemId,
        requestId,
      },
    );
  typia.assert(cancellationRequest);
  // 4. Validate the cancellation request has a reason
  TestValidator.predicate(
    "has cancellation reason",
    cancellationRequest.reason.length > 0,
  );
  // 5. Validate the status is 'rejected'
  TestValidator.equals(
    "status is rejected",
    cancellationRequest.status,
    "rejected",
  );
  // 6. Validate the sellerResponse contains rejection text
  TestValidator.predicate(
    "has seller rejection response",
    cancellationRequest.sellerResponse !== null &&
      cancellationRequest.sellerResponse.length > 0,
  );
  // 7. Validate order item reference exists with all required fields
  TestValidator.predicate(
    "order item has ID",
    cancellationRequest.orderItem.id.length > 0,
  );
  TestValidator.equals(
    "order item quantity is positive",
    cancellationRequest.orderItem.quantity > 0,
    true,
  );
  TestValidator.predicate(
    "order item has unit price",
    cancellationRequest.orderItem.unit_price >= 0,
  );
  TestValidator.predicate(
    "order item has status",
    cancellationRequest.orderItem.status.length > 0,
  );
  // 8. Validate product variant reference in order item
  TestValidator.predicate(
    "product variant has ID",
    cancellationRequest.orderItem.productVariant.id.length > 0,
  );
  TestValidator.predicate(
    "product variant has SKU code",
    cancellationRequest.orderItem.productVariant.sku_code.length > 0,
  );
  // 9. Validate seller reference in order item matches authenticated seller
  TestValidator.equals(
    "order item seller ID matches",
    cancellationRequest.orderItem.seller.id,
    sellerAuth.id,
  );
  // 10. Validate timestamps are properly formatted
  TestValidator.predicate(
    "createdAt is valid datetime",
    cancellationRequest.createdAt.length > 0,
  );
  TestValidator.predicate(
    "updatedAt is valid datetime",
    cancellationRequest.updatedAt.length > 0,
  );
  // 11. Validate updatedAt is after or equal to createdAt
  const createdAt = new Date(cancellationRequest.createdAt);
  const updatedAt = new Date(cancellationRequest.updatedAt);
  TestValidator.predicate(
    "updatedAt after or equal to createdAt",
    updatedAt >= createdAt,
  );
}
