import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrder";
import type { IEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItem";
import type { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import type { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import type { IEcommerceMallProductVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariantOption";
import type { IEcommerceMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallRefundRequest";
import type { IEcommerceMallRefundRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallRefundRequestSnapshot";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallSellerProfileSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfileSnapshot";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";
import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { generate_random_ecommerce_mall_customer_refund_requests_create } from "../../../generate/generate_random_ecommerce_mall_customer_refund_requests_create";
import { prepare_random_ecommerce_mall_refund_request } from "../../../prepare/prepare_random_ecommerce_mall_refund_request";

/**
 * Test the scenario where a seller rejects a customer's refund request with a reason.
 * A customer first creates a refund request for a delivered order item. Then an authenticated
 * seller calls this endpoint to reject the request by setting status to rejected and providing
 * a rejection reason. Verify the rejection is properly recorded, the refund request snapshot
 * captures the before and after state including the rejection reason, and the order item
 * remains in its current status without refund. Validate that the response includes the
 * rejection reason and proper audit timestamps.
 */
export async function test_api_refund_request_seller_rejection_with_reason(
  connection: api.IConnection,
): Promise<void> {
  // 1. Customer creates a refund request
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {});
  const refundRequest =
    await generate_random_ecommerce_mall_customer_refund_requests_create(
      customerConnection,
      {
        body: {
          reason: RandomGenerator.paragraph({ sentences: 3 }),
        },
      },
    );
  typia.assert(refundRequest);
  // Store original order item status for comparison
  const originalOrderItemStatus = refundRequest.orderItem.status;
  // 2. Seller authenticates
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerConnection, {});
  // 3. Seller rejects the refund request with a reason
  const rejectionReason = RandomGenerator.paragraph({ sentences: 2 });
  const rejectedRefundRequest =
    await api.functional.ecommerceMall.seller.refund_requests.update(
      sellerConnection,
      {
        refundRequestId: refundRequest.id,
        body: {
          status: "rejected",
          responseReason: rejectionReason,
        } satisfies IEcommerceMallRefundRequest.IUpdate,
      },
    );
  typia.assert(rejectedRefundRequest);
  // 4. Validate rejection was properly recorded
  TestValidator.equals(
    "refund request status should be rejected",
    rejectedRefundRequest.status,
    "rejected",
  );
  TestValidator.notEquals(
    "refund request should have respondedAt timestamp",
    rejectedRefundRequest.respondedAt,
    null,
  );
  TestValidator.notEquals(
    "refund request should have updatedAt timestamp",
    rejectedRefundRequest.updatedAt,
    null,
  );
  // 5. Validate snapshots were created with rejection reason preserved
  TestValidator.predicate(
    "refund request snapshots should exist",
    rejectedRefundRequest.snapshots.length > 0,
  );
  const latestSnapshot =
    rejectedRefundRequest.snapshots[rejectedRefundRequest.snapshots.length - 1];
  TestValidator.equals(
    "snapshot should have customer reason",
    latestSnapshot.reason,
    refundRequest.reason,
  );
  TestValidator.equals(
    "snapshot should have rejected status",
    latestSnapshot.status,
    "rejected",
  );
  TestValidator.equals(
    "snapshot should have response reason",
    latestSnapshot.responseReason,
    rejectionReason,
  );
  TestValidator.predicate(
    "snapshot should have createdAt timestamp",
    typeof latestSnapshot.createdAt === "string",
  );
  // 6. Validate order item remains in original status (not refunded)
  TestValidator.equals(
    "order item status should remain unchanged",
    rejectedRefundRequest.orderItem.status,
    originalOrderItemStatus,
  );
  TestValidator.notEquals(
    "order item status should not be refunded",
    rejectedRefundRequest.orderItem.status,
    "refunded",
  );
}
