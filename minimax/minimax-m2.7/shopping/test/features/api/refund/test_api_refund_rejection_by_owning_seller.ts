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

export async function test_api_refund_rejection_by_owning_seller(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as seller who owns the product with refund request
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {});
  typia.assert(sellerAuth);
  // 2. List pending refund requests for the seller
  const pendingRequests =
    await api.functional.ecommerceMall.seller.refund_requests.index(
      sellerConnection,
      {
        body: {
          status: "pending",
        } satisfies IEcommerceMallRefundRequest.IRequest,
      },
    );
  typia.assert(pendingRequests);
  // 3. Get the first pending refund request belonging to this seller
  const pendingRequest = pendingRequests.data.find(
    (req) => req.seller.id === sellerAuth.id && req.status === "pending",
  );
  typia.assertGuard(pendingRequest!);
  // 4. Reject the refund request with a valid reason
  const rejectionReason = RandomGenerator.paragraph({ sentences: 3 });
  const rejectedRequest =
    await api.functional.ecommerceMall.seller.refund_requests.reject(
      sellerConnection,
      {
        requestId: pendingRequest.id,
        body: {
          seller_response_reason: rejectionReason,
        } satisfies IEcommerceMallRefundRequest.IReject,
      },
    );
  typia.assert(rejectedRequest);
  // 5. Verify the refund request status changed from 'pending' to 'rejected'
  TestValidator.equals(
    "status is rejected",
    rejectedRequest.status,
    "rejected",
  );
  // 6. Verify seller_response_at timestamp is now set
  TestValidator.predicate(
    "seller_response_at is set",
    rejectedRequest.seller_response_at !== null &&
      rejectedRequest.seller_response_at !== undefined,
  );
  // 7. Verify a refund request snapshot was created
  TestValidator.predicate(
    "has snapshots",
    rejectedRequest.refundRequestSnapshots.length > 0,
  );
  // 8. Verify snapshot has seller_response='rejected' and rejection reason captured
  const latestSnapshot = rejectedRequest.refundRequestSnapshots[0];
  TestValidator.equals(
    "snapshot seller_response is rejected",
    latestSnapshot.seller_response,
    "rejected",
  );
  TestValidator.equals(
    "snapshot seller_response_reason matches",
    latestSnapshot.seller_response_reason,
    rejectionReason,
  );
  // 9. Verify the snapshot preserves the original customer reason and 'pending' status at time of rejection
  TestValidator.equals(
    "snapshot_reason preserved from original request",
    latestSnapshot.snapshot_reason,
    pendingRequest.reason,
  );
  TestValidator.equals(
    "snapshot_status is pending at rejection time",
    latestSnapshot.snapshot_status,
    "pending",
  );
}