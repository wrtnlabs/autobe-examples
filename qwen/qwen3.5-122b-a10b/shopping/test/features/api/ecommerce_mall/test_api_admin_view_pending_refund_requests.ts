import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallOrderItemRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItemRefundRequest";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallOrderItemRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallOrderItemRefundRequest";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

/**
 * Test administrator viewing pending refund requests across the platform.
 * 1. Register and authenticate as administrator
 * 2. Retrieve paginated list of pending refund requests
 * 3. Validate response structure and pagination metadata
 * 4. Verify all refund requests have status='pending'
 * 5. Validate refund request summary fields
 */
export async function test_api_admin_view_pending_refund_requests(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate as administrator
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.assert<string & tags.MinLength<1> & tags.MaxLength<255> & tags.Format<"email">>(typia.random<string & tags.Format<"email">>()),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IEcommerceMallAdmin.IJoin,
  });
  typia.assert(adminAuth);
  // 2. Retrieve paginated list of pending refund requests
  const refundRequests =
    await api.functional.ecommerceMall.admin.refund_requests.pending.index(
      adminConnection,
      {
        body: {
          status: "pending",
          page: 1,
          limit: 10,
          sortBy: "requested_at",
          order: "desc",
        } satisfies IEcommerceMallOrderItemRefundRequest.IRequest,
      },
    );
  typia.assert(refundRequests);
  // 3. Validate pagination metadata
  TestValidator.equals(
    "current page is 1",
    refundRequests.pagination.current,
    1,
  );
  TestValidator.predicate(
    "limit is positive",
    refundRequests.pagination.limit > 0,
  );
  TestValidator.predicate(
    "records count is non-negative",
    refundRequests.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pages count is non-negative",
    refundRequests.pagination.pages >= 0,
  );
  // 4. Verify all refund requests have status='pending'
  for (const request of refundRequests.data) {
    TestValidator.equals(
      "refund request status is pending",
      request.status,
      "pending",
    );
  }
  // 5. Validate refund request summary fields when data exists
  if (refundRequests.data.length > 0) {
    const firstRequest = refundRequests.data[0];
    typia.assert(firstRequest);
    TestValidator.predicate(
      "refund request has valid ID",
      firstRequest.id.length > 0,
    );
    TestValidator.predicate(
      "refund request has reason",
      firstRequest.reason.length > 0,
    );
    TestValidator.predicate(
      "refund request has requested_at timestamp",
      firstRequest.requested_at.length > 0,
    );
    TestValidator.predicate(
      "refund request has days_since_delivery",
      firstRequest.days_since_delivery >= 0,
    );
    TestValidator.predicate(
      "refund request has order number",
      firstRequest.order_number.length > 0,
    );
    TestValidator.predicate(
      "refund request has product name",
      firstRequest.product_name.length > 0,
    );
    TestValidator.predicate(
      "refund request has seller shop name",
      firstRequest.seller_shop_name.length > 0,
    );
  }
}