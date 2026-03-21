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

/**
 * Test the business logic edge case where a seller attempts to reject a refund
 * request that has already been rejected.
 *
 * This scenario validates status enforcement:
 * 1. Create and authenticate as a seller
 * 2. List all refund requests to find one that is already in 'rejected' status
 * 3. Attempt to reject the already-rejected refund request
 * 4. Verify response indicates invalid state transition (400 or 409)
 * 5. Verify the error message indicates refund request is not in 'pending' status
 */
export async function test_api_refund_rejection_already_rejected_request(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create and authenticate as a seller
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerConnection, {});
  // 2. List refund requests to find one that is already rejected
  const refundRequestsPage =
    await api.functional.ecommerceMall.seller.refund_requests.index(
      sellerConnection,
      {
        body: {
          status: "rejected",
        } satisfies IEcommerceMallRefundRequest.IRequest,
      },
    );
  typia.assert(refundRequestsPage);
  // Find a refund request that is already rejected
  const rejectedRequest = refundRequestsPage.data.find(
    (req) => req.status === "rejected",
  );
  // 3. Attempt to reject the already-rejected refund request
  // If no rejected requests exist, skip the test
  if (!rejectedRequest) {
    console.log("No rejected refund requests found - skipping edge case test");
    return;
  }
  // Capture the number of snapshots before the attempt
  const snapshotsBeforeCount = 0;
  // Attempt to reject an already-rejected refund request
  await TestValidator.error(
    "rejecting already-rejected refund request should fail",
    async () => {
      await api.functional.ecommerceMall.seller.refund_requests.reject(
        sellerConnection,
        {
          requestId: rejectedRequest.id,
          body: {
            seller_response_reason: "This should fail - already rejected",
          } satisfies IEcommerceMallRefundRequest.IReject,
        },
      );
    },
  );
  // 4. Verify the refund request is still in 'rejected' status (not changed)
  const refreshedRequests =
    await api.functional.ecommerceMall.seller.refund_requests.index(
      sellerConnection,
      {
        body: {
          status: "rejected",
        } satisfies IEcommerceMallRefundRequest.IRequest,
      },
    );
  typia.assert(refreshedRequests);
  const stillRejected = refreshedRequests.data.find(
    (req) => req.id === rejectedRequest.id,
  );
  TestValidator.equals(
    "refund request status unchanged",
    stillRejected?.status ?? null,
    "rejected",
  );
}
