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

export async function test_api_refund_rejection_unauthorized_seller(
  connection: api.IConnection,
): Promise<void> {
  // 1. First seller joins and authenticates
  const seller1Connection: api.IConnection = { host: connection.host };
  await authorize_seller_join(seller1Connection, {});
  // 2. List refund requests to find one belonging to first seller
  const refundRequestsResponse =
    await api.functional.ecommerceMall.seller.refund_requests.index(
      seller1Connection,
      {
        body: {
          limit: 100,
          page: 1,
        } satisfies IEcommerceMallRefundRequest.IRequest,
      },
    );
  typia.assert(refundRequestsResponse);
  // Find a pending refund request owned by seller1
  const pendingRefundRequest = refundRequestsResponse.data.find(
    (request) => request.status === "pending",
  );
  // 3. Second seller joins and authenticates
  const seller2Connection: api.IConnection = { host: connection.host };
  await authorize_seller_join(seller2Connection, {});
  // 4. Attempt to reject a refund request - use found request or random UUID
  const requestIdToReject =
    pendingRefundRequest?.id ?? typia.random<string & tags.Format<"uuid">>();
  // 5. Verify 403 Forbidden is returned when seller2 tries to reject
  // an unauthorized refund request (doesn\'t belong to them)
  await TestValidator.httpError(
    "unauthorized seller cannot reject other seller\'s refund request",
    403,
    async () =>
      await api.functional.ecommerceMall.seller.refund_requests.reject(
        seller2Connection,
        {
          requestId: requestIdToReject,
          body: {
            seller_response_reason: "Unauthorized rejection attempt",
          } satisfies IEcommerceMallRefundRequest.IReject,
        },
      ),
  );
  // 6. If we found a real pending refund request, verify it remains pending
  if (pendingRefundRequest) {
    const refreshedRequests =
      await api.functional.ecommerceMall.seller.refund_requests.index(
        seller1Connection,
        {
          body: {
            limit: 100,
            page: 1,
          } satisfies IEcommerceMallRefundRequest.IRequest,
        },
      );
    typia.assert(refreshedRequests);
    const unchangedRequest = refreshedRequests.data.find(
      (req) => req.id === pendingRefundRequest.id,
    );
    TestValidator.equals(
      "refund request status remains pending after unauthorized rejection attempt",
      unchangedRequest?.status,
      "pending",
    );
  }
}
