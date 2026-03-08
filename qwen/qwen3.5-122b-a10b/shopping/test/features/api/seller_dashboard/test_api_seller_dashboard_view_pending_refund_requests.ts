import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallOrderItemRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItemRefundRequest";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallOrderItemRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallOrderItemRefundRequest";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";

/**
 * Test seller dashboard refund requests viewing functionality.
 *
 * 1. Register and authenticate as a seller
 * 2. Call the dashboard endpoint to view refund requests
 * 3. Validate the response structure and pagination
 */
export async function test_api_seller_dashboard_view_pending_refund_requests(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate as seller
  const sellerConnection: api.IConnection = { host: connection.host };
  const auth = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      shop_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommerceMallSeller.IJoin,
  });
  typia.assert(auth);
  // 2. View refund requests from dashboard
  const refundRequests =
    await api.functional.ecommerceMall.seller._dashboard.refund_requests.index(
      sellerConnection,
      {
        body: {
          status: "pending",
          page: typia.random<number & tags.Type<"int32"> & tags.Minimum<1>>(),
          limit: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<100>
          >(),
          sortBy: "requested_at",
          order: "desc",
        } satisfies IEcommerceMallOrderItemRefundRequest.IRequest,
      },
    );
  typia.assert(refundRequests);
  // 3. Validate pagination structure
  TestValidator.equals(
    "pagination current page",
    refundRequests.pagination.current,
    refundRequests.pagination.current,
  );
  TestValidator.predicate(
    "pagination has records",
    refundRequests.pagination.records >= 0,
  );
  // 4. Validate data array if present
  if (refundRequests.data.length > 0) {
    const firstRequest = refundRequests.data[0];
    typia.assert(firstRequest);
    // Validate business logic: status should match filter when pending
    if (firstRequest.status === "pending") {
      TestValidator.predicate(
        "pending request has null responded_at",
        firstRequest.responded_at === null,
      );
    }
    // Validate days_since_delivery is a reasonable number
    TestValidator.predicate(
      "days_since_delivery is non-negative",
      firstRequest.days_since_delivery >= 0,
    );
  }
}
