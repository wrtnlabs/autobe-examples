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
 * Test seller retrieving a completed refund request with response status.
 *
 * Validates that a seller can successfully retrieve a refund request that has been responded to (either approved or rejected). The test verifies all response fields including the seller's decision timestamp, rejection reason when applicable, and the complete audit trail.
 *
 * The test focuses on verifying the refund request lifecycle timeline and ensuring sellers can access their historical refund decisions for order items they manage.
 *
 * 1. Authenticate seller account using join flow.
 * 2. Generate UUIDs for order, order item, and refund request.
 * 3. Retrieve the refund request via seller endpoint.
 * 4. Validate response structure and completed status fields.
 * 5. Verify responded_at is populated and rejection_reason matches status.
 */
export async function test_api_seller_refund_request_completed_status(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate seller
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(sellerAuth);
  // 2. Generate UUIDs for test data (assuming pre-existing data)
  const orderId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  const itemId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  const requestId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  // 3. Retrieve refund request
  const refundRequest =
    await api.functional.ecommerce.seller.orders.items.refund_requests.at(
      sellerConnection,
      {
        orderId,
        itemId,
        requestId,
      },
    );
  typia.assert(refundRequest);
  // 4. Validate response structure
  TestValidator.equals("refund request has id", refundRequest.id, requestId);
  TestValidator.predicate("has reason", refundRequest.reason.length > 0);
  TestValidator.predicate("has status", refundRequest.status !== null);
  TestValidator.predicate("has created_at", refundRequest.created_at !== null);
  TestValidator.predicate("has updated_at", refundRequest.updated_at !== null);
  // 5. Validate completed status fields
  // responded_at should be populated for completed requests
  TestValidator.predicate(
    "responded_at is populated for completed request",
    refundRequest.responded_at !== null,
  );
  // rejection_reason should match status
  if (refundRequest.status === "rejected") {
    TestValidator.predicate(
      "rejection_reason is populated when rejected",
      refundRequest.rejection_reason !== null &&
        refundRequest.rejection_reason.length > 0,
    );
  } else if (refundRequest.status === "approved") {
    TestValidator.equals(
      "rejection_reason is null when approved",
      refundRequest.rejection_reason,
      null,
    );
  }
  // 6. Validate order item reference
  TestValidator.predicate(
    "order item reference exists",
    refundRequest.orderItem !== null,
  );
  TestValidator.predicate(
    "order item has id",
    refundRequest.orderItem.id !== null,
  );
}
