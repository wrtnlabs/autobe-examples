import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallRefundRequest";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallRefundRequest";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

/**
 * Test that administrators can filter refund requests by status (pending, approved, rejected)
 * to focus on specific workflow stages.
 *
 * Validates:
 * - Filtering by 'pending' returns only unresolved refund requests
 * - Filtering by 'approved' returns only approved refund requests
 * - Filtering by 'rejected' returns only rejected refund requests
 * - hasResponse field is false for pending requests, true for approved/rejected
 * - respondedAt is null for pending requests, has timestamp for approved/rejected
 * - Proper pagination metadata is returned for each filtered query
 */
export async function test_api_admin_refund_request_listing_status_filter(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create admin connection and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {});
  // 2. Test filtering by 'pending' status
  const pendingResponse =
    await api.functional.ecommerceMall.admin.refundRequests.index(
      adminConnection,
      {
        body: {
          status: "pending",
          limit: 100,
        } satisfies IEcommerceMallRefundRequest.IRequest,
      },
    );
  typia.assert(pendingResponse);
  // Validate all pending requests have correct properties
  for (const request of pendingResponse.data) {
    TestValidator.equals("pending status matches", request.status, "pending");
    TestValidator.equals(
      "pending hasResponse is false",
      request.hasResponse,
      false,
    );
    TestValidator.equals(
      "pending respondedAt is null",
      request.respondedAt,
      null,
    );
  }
  // 3. Test filtering by 'approved' status
  const approvedResponse =
    await api.functional.ecommerceMall.admin.refundRequests.index(
      adminConnection,
      {
        body: {
          status: "approved",
          limit: 100,
        } satisfies IEcommerceMallRefundRequest.IRequest,
      },
    );
  typia.assert(approvedResponse);
  // Validate all approved requests have correct properties
  for (const request of approvedResponse.data) {
    TestValidator.equals("approved status matches", request.status, "approved");
    TestValidator.equals(
      "approved hasResponse is true",
      request.hasResponse,
      true,
    );
    TestValidator.predicate(
      "approved respondedAt is not null",
      request.respondedAt !== null,
    );
  }
  // 4. Test filtering by 'rejected' status
  const rejectedResponse =
    await api.functional.ecommerceMall.admin.refundRequests.index(
      adminConnection,
      {
        body: {
          status: "rejected",
          limit: 100,
        } satisfies IEcommerceMallRefundRequest.IRequest,
      },
    );
  typia.assert(rejectedResponse);
  // Validate all rejected requests have correct properties
  for (const request of rejectedResponse.data) {
    TestValidator.equals("rejected status matches", request.status, "rejected");
    TestValidator.equals(
      "rejected hasResponse is true",
      request.hasResponse,
      true,
    );
    TestValidator.predicate(
      "rejected respondedAt is not null",
      request.respondedAt !== null,
    );
  }
  // 5. Validate pagination metadata exists for each response
  TestValidator.predicate(
    "pending pagination exists",
    pendingResponse.pagination !== undefined,
  );
  TestValidator.predicate(
    "approved pagination exists",
    approvedResponse.pagination !== undefined,
  );
  TestValidator.predicate(
    "rejected pagination exists",
    rejectedResponse.pagination !== undefined,
  );
}
