import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCancellationRequest";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrder";
import type { IEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItem";
import type { IEcommerceMallProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductSnapshot";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfile";
import type { IEcommerceMallSellerProfileSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfileSnapshot";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallCancellationRequest";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

/**
 * Test that an administrator can filter cancellation requests by status to view
 * only pending requests awaiting seller action.
 *
 * Steps:
 * 1. Authenticate as admin via POST /auth/admin/join with valid credentials
 * 2. Call PATCH /admin/cancellation-requests with status filter set to "pending"
 * 3. Verify all returned cancellation requests have status equal to "pending"
 * 4. Verify pending requests include customer and seller information for review
 * 5. Verify pending requests include order item details with frozen product snapshot
 * 6. Test filtering by "approved" status and verify all results show approved status
 * 7. Test filtering by "rejected" status and verify all results show rejected status
 *
 * This validates the business workflow where administrators need to filter cancellation
 * requests by status to efficiently review pending requests or audit historical
 * approval/rejection decisions.
 */
export async function test_api_cancellation_request_filtering_by_status(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as admin
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  // 2. Test filtering by "pending" status
  const pendingResult =
    await api.functional.ecommerceMall.admin.cancellation_requests.index(
      adminConnection,
      {
        body: {
          status: "pending",
        } satisfies IEcommerceMallCancellationRequest.IRequest,
      },
    );
  typia.assert(pendingResult);
  // 3. Verify all returned cancellation requests have "pending" status
  for (const request of pendingResult.data) {
    TestValidator.equals(
      "cancellation request status is pending",
      request.status,
      "pending",
    );
  }
  // 4. Verify pending requests include customer and seller information
  for (const request of pendingResult.data) {
    TestValidator.predicate(
      "customer information is present",
      request.customer !== undefined && request.customer !== null,
    );
    TestValidator.predicate(
      "seller information is present",
      request.seller !== undefined && request.seller !== null,
    );
    TestValidator.equals(
      "reason is present",
      request.reason !== undefined,
      true,
    );
  }
  // 5. Verify pending requests include order item details with frozen product snapshot
  for (const request of pendingResult.data) {
    TestValidator.predicate(
      "order item information is present",
      request.orderItem !== undefined && request.orderItem !== null,
    );
    TestValidator.predicate(
      "product snapshot is present",
      request.orderItem.productSnapshot !== undefined &&
        request.orderItem.productSnapshot !== null,
    );
    TestValidator.predicate(
      "seller profile snapshot is present",
      request.orderItem.sellerProfileSnapshot !== undefined &&
        request.orderItem.sellerProfileSnapshot !== null,
    );
  }
  // 6. Test filtering by "approved" status
  const approvedResult =
    await api.functional.ecommerceMall.admin.cancellation_requests.index(
      adminConnection,
      {
        body: {
          status: "approved",
        } satisfies IEcommerceMallCancellationRequest.IRequest,
      },
    );
  typia.assert(approvedResult);
  for (const request of approvedResult.data) {
    TestValidator.equals(
      "cancellation request status is approved",
      request.status,
      "approved",
    );
  }
  // 7. Test filtering by "rejected" status
  const rejectedResult =
    await api.functional.ecommerceMall.admin.cancellation_requests.index(
      adminConnection,
      {
        body: {
          status: "rejected",
        } satisfies IEcommerceMallCancellationRequest.IRequest,
      },
    );
  typia.assert(rejectedResult);
  for (const request of rejectedResult.data) {
    TestValidator.equals(
      "cancellation request status is rejected",
      request.status,
      "rejected",
    );
  }
}
