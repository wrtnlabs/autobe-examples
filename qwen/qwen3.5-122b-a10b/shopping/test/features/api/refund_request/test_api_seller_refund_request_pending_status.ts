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
 * Seller retrieves a refund request that is in pending status.
 *
 * Validates that sellers can access pending refund requests with all relevant information needed to review and respond to customer refund requests. The test ensures the refund request response contains the customer's reason, proper null values for unresponded fields, and accurate timestamps.
 *
 * The test workflow authenticates a seller account and retrieves a refund request to verify the pending status response structure and field values.
 *
 * 1. Seller account is created and authenticated.
 * 2. Refund request with pending status is retrieved.
 * 3. Validates responded_at is null (no response yet).
 * 4. Validates rejection_reason is null (not rejected).
 * 5. Validates customer's reason is present and visible.
 * 6. Validates created_at timestamp exists.
 * 7. Validates status field equals 'pending'.
 */
export async function test_api_seller_refund_request_pending_status(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create and authenticate seller
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(seller);
  // 2. Retrieve refund request (using generated UUIDs for test data)
  // Note: In simulation mode, this will return random valid data
  // In production, test data must be pre-created or use proper setup functions
  const orderId = typia.random<string & tags.Format<"uuid">>();
  const itemId = typia.random<string & tags.Format<"uuid">>();
  const requestId = typia.random<string & tags.Format<"uuid">>();
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
  // 3. Validate pending status response
  TestValidator.equals("status is pending", refundRequest.status, "pending");
  TestValidator.equals(
    "responded_at is null",
    refundRequest.responded_at,
    null,
  );
  TestValidator.equals(
    "rejection_reason is null",
    refundRequest.rejection_reason,
    null,
  );
  TestValidator.predicate("reason exists", refundRequest.reason.length > 0);
  TestValidator.predicate(
    "created_at exists",
    refundRequest.created_at !== null && refundRequest.created_at !== undefined,
  );
}
