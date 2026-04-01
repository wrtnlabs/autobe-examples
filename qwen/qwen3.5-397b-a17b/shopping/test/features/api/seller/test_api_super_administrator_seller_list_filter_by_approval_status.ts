import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallSeller";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerApprovalRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerApprovalRequest";
import type { IShoppingMallSuperAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSuperAdministrator";
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
import { authorize_super_administrator_join } from "../../../authorize/authorize_super_administrator_join";
import { authorize_super_administrator_login } from "../../../authorize/authorize_super_administrator_login";
import { authorize_super_administrator_refresh } from "../../../authorize/authorize_super_administrator_refresh";
import { generate_random_shopping_mall_seller_approval_requests_create } from "../../../generate/generate_random_shopping_mall_seller_approval_requests_create";
import { prepare_random_shopping_mall_seller_approval_request } from "../../../prepare/prepare_random_shopping_mall_seller_approval_request";

export async function test_api_super_administrator_seller_list_filter_by_approval_status(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create and authenticate as super administrator
  const superAdminConnection: api.IConnection = { host: connection.host };
  await authorize_super_administrator_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IShoppingMallSuperAdministrator.IJoin,
  });
  // 2. Create three seller accounts
  const seller1Email = typia.random<string & tags.Format<"email">>();
  const seller2Email = typia.random<string & tags.Format<"email">>();
  const seller3Email = typia.random<string & tags.Format<"email">>();
  const seller1Connection: api.IConnection = { host: connection.host };
  const seller1Auth = await authorize_seller_join(seller1Connection, {
    body: {
      email: seller1Email,
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IShoppingMallSeller.IJoin,
  });
  typia.assert(seller1Auth);
  const seller2Connection: api.IConnection = { host: connection.host };
  const seller2Auth = await authorize_seller_join(seller2Connection, {
    body: {
      email: seller2Email,
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IShoppingMallSeller.IJoin,
  });
  typia.assert(seller2Auth);
  const seller3Connection: api.IConnection = { host: connection.host };
  const seller3Auth = await authorize_seller_join(seller3Connection, {
    body: {
      email: seller3Email,
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IShoppingMallSeller.IJoin,
  });
  typia.assert(seller3Auth);
  // 3. Each seller submits an approval request
  const approvalRequest1 =
    await api.functional.shoppingMall.seller.approval_requests.create(
      seller1Connection,
      {
        body: {} satisfies IShoppingMallSellerApprovalRequest.ICreate,
      },
    );
  typia.assert(approvalRequest1);
  const approvalRequest2 =
    await api.functional.shoppingMall.seller.approval_requests.create(
      seller2Connection,
      {
        body: {} satisfies IShoppingMallSellerApprovalRequest.ICreate,
      },
    );
  typia.assert(approvalRequest2);
  const approvalRequest3 =
    await api.functional.shoppingMall.seller.approval_requests.create(
      seller3Connection,
      {
        body: {} satisfies IShoppingMallSellerApprovalRequest.ICreate,
      },
    );
  typia.assert(approvalRequest3);
  // 4. Create and authenticate as administrator
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_administrator_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IShoppingMallAdministrator.IJoin,
  });
  // 5. Approve second seller's approval request
  const approvedRequest =
    await api.functional.shoppingMall.administrator.approval_requests.update(
      adminConnection,
      {
        requestId: approvalRequest2.id,
        body: {
          status: "approved",
        } satisfies IShoppingMallSellerApprovalRequest.IUpdate,
      },
    );
  typia.assert(approvedRequest);
  TestValidator.equals(
    "approval status is approved",
    approvedRequest.status,
    "approved",
  );
  // 6. Reject third seller's approval request with reason
  const rejectedRequest =
    await api.functional.shoppingMall.administrator.approval_requests.update(
      adminConnection,
      {
        requestId: approvalRequest3.id,
        body: {
          status: "rejected",
          rejection_reason: "Incomplete documentation provided",
        } satisfies IShoppingMallSellerApprovalRequest.IUpdate,
      },
    );
  typia.assert(rejectedRequest);
  TestValidator.equals(
    "approval status is rejected",
    rejectedRequest.status,
    "rejected",
  );
  TestValidator.equals(
    "rejection reason matches",
    rejectedRequest.rejection_reason,
    "Incomplete documentation provided",
  );
  // 7. Test filtering by status=pending
  const pendingResult =
    await api.functional.shoppingMall.superAdministrator.sellers.index(
      superAdminConnection,
      {
        body: {
          status: "pending",
          limit: 10,
          page: 1,
        } satisfies IShoppingMallSeller.IRequest,
      },
    );
  typia.assert(pendingResult);
  TestValidator.predicate(
    "pending filter returns at least one seller",
    pendingResult.data.length >= 1,
  );
  TestValidator.equals(
    "pending pagination records count",
    pendingResult.pagination.records,
    pendingResult.data.length,
  );
  for (const seller of pendingResult.data) {
    TestValidator.equals(
      "seller approval status is pending",
      seller.approval_status,
      "pending",
    );
  }
  // Verify seller1 is in pending results
  const hasSeller1 = pendingResult.data.some((s) => s.email === seller1Email);
  TestValidator.predicate("seller1 is in pending results", hasSeller1);
  // 8. Test filtering by status=approved
  const approvedResult =
    await api.functional.shoppingMall.superAdministrator.sellers.index(
      superAdminConnection,
      {
        body: {
          status: "approved",
          limit: 10,
          page: 1,
        } satisfies IShoppingMallSeller.IRequest,
      },
    );
  typia.assert(approvedResult);
  TestValidator.predicate(
    "approved filter returns at least one seller",
    approvedResult.data.length >= 1,
  );
  TestValidator.equals(
    "approved pagination records count",
    approvedResult.pagination.records,
    approvedResult.data.length,
  );
  for (const seller of approvedResult.data) {
    TestValidator.equals(
      "seller approval status is approved",
      seller.approval_status,
      "approved",
    );
  }
  // Verify seller2 is in approved results
  const hasSeller2 = approvedResult.data.some((s) => s.email === seller2Email);
  TestValidator.predicate("seller2 is in approved results", hasSeller2);
  // 9. Test filtering by status=rejected
  const rejectedResult =
    await api.functional.shoppingMall.superAdministrator.sellers.index(
      superAdminConnection,
      {
        body: {
          status: "rejected",
          limit: 10,
          page: 1,
        } satisfies IShoppingMallSeller.IRequest,
      },
    );
  typia.assert(rejectedResult);
  TestValidator.predicate(
    "rejected filter returns at least one seller",
    rejectedResult.data.length >= 1,
  );
  TestValidator.equals(
    "rejected pagination records count",
    rejectedResult.pagination.records,
    rejectedResult.data.length,
  );
  for (const seller of rejectedResult.data) {
    TestValidator.equals(
      "seller approval status is rejected",
      seller.approval_status,
      "rejected",
    );
  }
  // Verify seller3 is in rejected results
  const hasSeller3 = rejectedResult.data.some((s) => s.email === seller3Email);
  TestValidator.predicate("seller3 is in rejected results", hasSeller3);
  // 10. Verify each filter returns mutually exclusive results
  TestValidator.notEquals(
    "pending and approved results differ",
    pendingResult.data[0]?.id,
    approvedResult.data[0]?.id,
  );
  TestValidator.notEquals(
    "pending and rejected results differ",
    pendingResult.data[0]?.id,
    rejectedResult.data[0]?.id,
  );
  TestValidator.notEquals(
    "approved and rejected results differ",
    approvedResult.data[0]?.id,
    rejectedResult.data[0]?.id,
  );
}
