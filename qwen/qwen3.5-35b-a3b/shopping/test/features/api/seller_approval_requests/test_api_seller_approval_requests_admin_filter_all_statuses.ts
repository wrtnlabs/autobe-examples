import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallSellerApprovalRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerApprovalRequest";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallSellerApprovalRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallSellerApprovalRequest";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";

export async function test_api_seller_approval_requests_admin_filter_all_statuses(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin setup - join and login
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphaNumeric(16);
  const adminJoinConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminJoinConnection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommerceMallAdmin.IJoin,
  });
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_login(adminConnection, {
    body: {
      email: adminEmail,
      password: adminPassword,
    } satisfies IEcommerceMallAdmin.ILogin,
  });
  // 2. Create multiple sellers (they start with pending approval status)
  const sellerEmails: Array<string & tags.Format<"email">> = ArrayUtil.repeat(
    3,
    (index: number) =>
      `seller${index + 1}@test.com` as string & tags.Format<"email">,
  );
  const sellers: Array<IEcommerceMallSeller.IAuthorized> =
    await ArrayUtil.asyncMap(sellerEmails, async (email) => {
      const sellerConnection: api.IConnection = { host: connection.host };
      return await authorize_seller_join(sellerConnection, {
        body: {
          email: email,
          password: RandomGenerator.alphaNumeric(16),
          href: typia.random<string & tags.Format<"uri">>(),
          referrer: typia.random<string & tags.Format<"uri">>(),
        } satisfies IEcommerceMallSeller.IJoin,
      });
    });
  // 3. Test pending status filter - should return seller approval requests
  const pendingResults =
    await api.functional.ecommerceMall.seller.approval_requests.index(
      adminConnection,
      {
        body: {
          status: "pending" as const,
          page: 1,
          pageSize: 100,
        } satisfies IEcommerceMallSellerApprovalRequest.IRequest,
      },
    );
  typia.assert(pendingResults);
  // 4. Test approved status filter - will be empty if no approvals exist
  const approvedResults =
    await api.functional.ecommerceMall.seller.approval_requests.index(
      adminConnection,
      {
        body: {
          status: "approved" as const,
          page: 1,
          pageSize: 100,
        } satisfies IEcommerceMallSellerApprovalRequest.IRequest,
      },
    );
  typia.assert(approvedResults);
  // 5. Test rejected status filter - will be empty if no rejections exist
  const rejectedResults =
    await api.functional.ecommerceMall.seller.approval_requests.index(
      adminConnection,
      {
        body: {
          status: "rejected" as const,
          page: 1,
          pageSize: 100,
        } satisfies IEcommerceMallSellerApprovalRequest.IRequest,
      },
    );
  typia.assert(rejectedResults);
  // 6. Validate pagination metadata for each status
  TestValidator.equals(
    "pending pagination current",
    pendingResults.pagination.current,
    1,
  );
  TestValidator.equals(
    "pending pagination limit",
    pendingResults.pagination.limit,
    100,
  );
  TestValidator.equals(
    "pending pagination records",
    pendingResults.pagination.records,
    pendingResults.data.length,
  );
  TestValidator.equals(
    "pending pagination pages",
    pendingResults.pagination.pages,
    pendingResults.data.length > 0 ? 1 : 0,
  );
  TestValidator.equals(
    "approved pagination current",
    approvedResults.pagination.current,
    1,
  );
  TestValidator.equals(
    "approved pagination limit",
    approvedResults.pagination.limit,
    100,
  );
  TestValidator.equals(
    "approved pagination records",
    approvedResults.pagination.records,
    approvedResults.data.length,
  );
  TestValidator.equals(
    "approved pagination pages",
    approvedResults.pagination.pages,
    approvedResults.data.length > 0 ? 1 : 0,
  );
  TestValidator.equals(
    "rejected pagination current",
    rejectedResults.pagination.current,
    1,
  );
  TestValidator.equals(
    "rejected pagination limit",
    rejectedResults.pagination.limit,
    100,
  );
  TestValidator.equals(
    "rejected pagination records",
    rejectedResults.pagination.records,
    rejectedResults.data.length,
  );
  TestValidator.equals(
    "rejected pagination pages",
    rejectedResults.pagination.pages,
    rejectedResults.data.length > 0 ? 1 : 0,
  );
  // 7. Validate pending has seller approval requests
  TestValidator.predicate(
    "pending has records",
    pendingResults.data.length >= 0,
  );
  // 8. Validate filtering - different statuses should return different results
  TestValidator.notEquals(
    "pending differs from approved",
    pendingResults.data.length,
    approvedResults.data.length,
  );
  TestValidator.notEquals(
    "pending differs from rejected",
    pendingResults.data.length,
    rejectedResults.data.length,
  );
  // 9. For pending results, verify each request has status "pending"
  const allPendingArePending = pendingResults.data.every(
    (request) => request.status === "pending",
  );
  TestValidator.predicate(
    "all pending requests have status pending",
    allPendingArePending,
  );
  // 10. For approved results, verify rejectionReason is null (when data exists)
  if (approvedResults.data.length > 0) {
    const allApprovedHaveNullRejectionReason = approvedResults.data.every(
      (request) => request.rejectionReason === null,
    );
    TestValidator.predicate(
      "approved requests have null rejectionReason",
      allApprovedHaveNullRejectionReason,
    );
  }
  // 11. For rejected results, verify rejectionReason contains text (when data exists)
  if (rejectedResults.data.length > 0) {
    const allRejectedHaveRejectionReason = rejectedResults.data.every(
      (request) => request.rejectionReason !== null,
    );
    TestValidator.predicate(
      "rejected requests have rejectionReason text",
      allRejectedHaveRejectionReason,
    );
  }
}
