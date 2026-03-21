import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrder";
import type { IEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItem";
import type { IEcommerceMallProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductSnapshot";
import type { IEcommerceMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallRefundRequest";
import type { IEcommerceMallRefundRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallRefundRequestSnapshot";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfile";
import type { IEcommerceMallSellerProfileSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfileSnapshot";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallRefundRequest";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";

export async function test_api_refund_request_seller_rejection(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate as seller
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
  // 2. Retrieve pending refund requests for this seller
  const refundRequestsPage =
    await api.functional.ecommerceMall.seller.refund_requests.index(
      sellerConnection,
      {
        body: {
          status: "pending",
        } satisfies IEcommerceMallRefundRequest.IRequest,
      },
    );
  typia.assert(refundRequestsPage);
  // 3. Find a pending refund request belonging to this seller
  const pendingRefundRequest = refundRequestsPage.data.find(
    (request) => request.seller.id === sellerAuth.id,
  );
  TestValidator.equals(
    "should have pending refund requests",
    pendingRefundRequest !== undefined,
    true,
  );
  const requestId = pendingRefundRequest!.id;
  const originalReason = pendingRefundRequest!.reason;
  const originalOrderItemStatus = pendingRefundRequest!.orderItem.status;
  // 4. Seller rejects the refund request
  const rejectedRequest =
    await api.functional.ecommerceMall.seller.refund_requests.update(
      sellerConnection,
      {
        requestId: requestId,
        body: {
          status: "rejected",
        } satisfies IEcommerceMallRefundRequest.IUpdate,
      },
    );
  typia.assert(rejectedRequest);
  // 5. Validate response structure
  TestValidator.equals(
    "status should be rejected",
    rejectedRequest.status,
    "rejected",
  );
  TestValidator.predicate(
    "seller_response_at should be populated",
    rejectedRequest.seller_response_at !== null &&
      rejectedRequest.seller_response_at !== undefined,
  );
  // 6. Validate snapshot was created
  TestValidator.predicate(
    "refundRequestSnapshots should contain at least one snapshot",
    rejectedRequest.refundRequestSnapshots.length > 0,
  );
  // 7. Get the latest snapshot
  const latestSnapshot =
    rejectedRequest.refundRequestSnapshots[
      rejectedRequest.refundRequestSnapshots.length - 1
    ];
  typia.assert(latestSnapshot);
  // 8. Validate snapshot content
  TestValidator.equals(
    "snapshot_reason should contain original reason",
    latestSnapshot.snapshot_reason,
    originalReason,
  );
  TestValidator.equals(
    "snapshot_status should be rejected",
    latestSnapshot.snapshot_status,
    "rejected",
  );
  TestValidator.equals(
    "seller_response should be rejected",
    latestSnapshot.seller_response,
    "rejected",
  );
  TestValidator.predicate(
    "seller_response_reason may be null",
    latestSnapshot.seller_response_reason === null ||
      latestSnapshot.seller_response_reason === undefined,
  );
  TestValidator.predicate(
    "created_at should be populated",
    latestSnapshot.created_at !== null &&
      latestSnapshot.created_at !== undefined,
  );
  // 9. Validate business logic - order item should remain delivered
  TestValidator.equals(
    "order item status should remain delivered",
    rejectedRequest.orderItem.status,
    originalOrderItemStatus,
  );
  TestValidator.equals(
    "order item status should be delivered",
    rejectedRequest.orderItem.status,
    "delivered",
  );
}
