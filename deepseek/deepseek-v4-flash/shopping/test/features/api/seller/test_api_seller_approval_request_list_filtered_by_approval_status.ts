import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IECommerceMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallAdministrator";
import type { IECommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallSeller";
import type { IECommerceMallSellerApprovalRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallSellerApprovalRequest";
import type { IECommerceMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallSellerProfile";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIECommerceMallSellerApprovalRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIECommerceMallSellerApprovalRequest";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";
import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";

/**
 * Test seller approval request filtered listing after administrative approval.
 *
 * Validates that a seller can filter their approval requests by status ('approved') after an administrator has reviewed and approved their pending registration request. This ensures the full approval lifecycle visibility for the seller.
 *
 * The seller account is automatically created with an initial pending approval request upon registration. The administrator finds this request, approves it, and then the seller queries their own requests filtered by each possible status ('approved', 'pending', 'rejected') to verify that only the correct status returns results.
 *
 * 1. Register Seller A via `authorize_seller_join` with randomized credentials.
 * 2. Register Administrator via `authorize_administrator_join` with randomized credentials.
 * 3. Administrator lists pending approval requests and locates Seller A's request by matching email.
 * 4. Administrator approves the pending request via the update endpoint.
 * 5. Seller lists approval requests filtered by 'approved' — validates status, reviewer, reviewed_at, and null rejection_reason.
 * 6. Seller lists approval requests filtered by 'pending' — validates 0 results.
 * 7. Seller lists approval requests filtered by 'rejected' — validates 0 results.
 */
export async function test_api_seller_approval_request_list_filtered_by_approval_status(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register Seller A
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerJoinOutput = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      shop_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(sellerJoinOutput);
  // 2. Register Administrator
  const adminConnection: api.IConnection = { host: connection.host };
  const adminJoinOutput = await authorize_administrator_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(adminJoinOutput);
  // 3. Administrator lists pending approval requests and finds Seller A's request
  const pendingPage =
    await api.functional.eCommerceMall.administrator.approval_requests.index(
      adminConnection,
      {
        body: {
          status: "pending",
          page: 1,
          limit: 100,
        } satisfies IECommerceMallSellerApprovalRequest.IRequest,
      },
    );
  typia.assert(pendingPage);
  const myRequest = pendingPage.data.find(
    (item) => item.seller.email === sellerJoinOutput.email,
  );
  if (myRequest === undefined)
    throw new Error("Failed to find seller's pending approval request");
  // 4. Administrator approves the request
  const approvedRequest =
    await api.functional.eCommerceMall.administrator.approval_requests.update(
      adminConnection,
      {
        requestId: myRequest.id,
        body: {
          status: "approved",
        } satisfies IECommerceMallSellerApprovalRequest.IUpdate,
      },
    );
  typia.assert(approvedRequest);
  // 5. Seller lists approval requests filtered by 'approved' status
  const approvedPage =
    await api.functional.eCommerceMall.seller.approval_requests.index(
      sellerConnection,
      {
        body: {
          status: "approved",
          page: 1,
          limit: 100,
        } satisfies IECommerceMallSellerApprovalRequest.IRequest,
      },
    );
  typia.assert(approvedPage);
  TestValidator.equals("approved request count", approvedPage.data.length, 1);
  const approvedItem = approvedPage.data[0]!;
  TestValidator.equals("status is approved", approvedItem.status, "approved");
  TestValidator.predicate("has reviewer", approvedItem.reviewer !== null);
  TestValidator.predicate("has reviewed_at", approvedItem.reviewed_at !== null);
  TestValidator.equals(
    "rejection_reason is null",
    approvedItem.rejection_reason,
    null,
  );
  // 6. Seller lists approval requests filtered by 'pending' status
  const pendingFilterPage =
    await api.functional.eCommerceMall.seller.approval_requests.index(
      sellerConnection,
      {
        body: {
          status: "pending",
          page: 1,
          limit: 100,
        } satisfies IECommerceMallSellerApprovalRequest.IRequest,
      },
    );
  typia.assert(pendingFilterPage);
  TestValidator.equals(
    "pending request count is 0",
    pendingFilterPage.data.length,
    0,
  );
  // 7. Seller lists approval requests filtered by 'rejected' status
  const rejectedFilterPage =
    await api.functional.eCommerceMall.seller.approval_requests.index(
      sellerConnection,
      {
        body: {
          status: "rejected",
          page: 1,
          limit: 100,
        } satisfies IECommerceMallSellerApprovalRequest.IRequest,
      },
    );
  typia.assert(rejectedFilterPage);
  TestValidator.equals(
    "rejected request count is 0",
    rejectedFilterPage.data.length,
    0,
  );
}
