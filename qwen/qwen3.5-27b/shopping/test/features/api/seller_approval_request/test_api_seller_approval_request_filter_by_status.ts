import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallSellerApprovalRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallSellerApprovalRequest";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerApprovalRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerApprovalRequest";
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
import { generate_random_shopping_mall_seller_seller_approval_requests_create } from "../../../generate/generate_random_shopping_mall_seller_seller_approval_requests_create";
import { prepare_random_shopping_mall_seller_approval_request } from "../../../prepare/prepare_random_shopping_mall_seller_approval_request";

/**
 * Test filtering seller approval requests by status (pending, approved, rejected).
 *
 * This test verifies that administrators can filter seller approval requests
 * by their current status. The test creates multiple seller approval requests
 * with different statuses and validates that the filter returns only matching
 * requests.
 *
 * Test Flow:
 * 1. Register and authenticate as administrator
 * 2. Create multiple seller accounts with approval requests (pending status)
 * 3. Approve some requests and reject others to create varied status data
 * 4. Filter requests by 'pending' status and verify results
 * 5. Filter requests by 'approved' status and verify results
 * 6. Filter requests by 'rejected' status and verify results
 * 7. Validate responded_at field (null for pending, populated for approved/rejected)
 */
export async function test_api_seller_approval_request_filter_by_status(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin authentication
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: "admin@test.com",
      password: "1234",
    },
  });
  // 2. Create first seller and approval request (will be approved)
  const seller1Connection: api.IConnection = { host: connection.host };
  const seller1Email = typia.random<string & tags.Format<"email">>();
  await authorize_seller_join(seller1Connection, {
    body: {
      email: seller1Email,
      password: "1234",
      shop_name: RandomGenerator.name(2),
    },
  });
  const request1 =
    await generate_random_shopping_mall_seller_seller_approval_requests_create(
      seller1Connection,
      {
        body: {
          reason: RandomGenerator.paragraph({ sentences: 3 }),
        },
      },
    );
  typia.assert(request1);
  // 3. Create second seller and approval request (will be rejected)
  const seller2Connection: api.IConnection = { host: connection.host };
  const seller2Email = typia.random<string & tags.Format<"email">>();
  await authorize_seller_join(seller2Connection, {
    body: {
      email: seller2Email,
      password: "1234",
      shop_name: RandomGenerator.name(2),
    },
  });
  const request2 =
    await generate_random_shopping_mall_seller_seller_approval_requests_create(
      seller2Connection,
      {
        body: {
          reason: RandomGenerator.paragraph({ sentences: 3 }),
        },
      },
    );
  typia.assert(request2);
  // 4. Create third seller and approval request (will remain pending)
  const seller3Connection: api.IConnection = { host: connection.host };
  const seller3Email = typia.random<string & tags.Format<"email">>();
  await authorize_seller_join(seller3Connection, {
    body: {
      email: seller3Email,
      password: "1234",
      shop_name: RandomGenerator.name(2),
    },
  });
  const request3 =
    await generate_random_shopping_mall_seller_seller_approval_requests_create(
      seller3Connection,
      {
        body: {
          reason: RandomGenerator.paragraph({ sentences: 3 }),
        },
      },
    );
  typia.assert(request3);
  // 5. Approve first request
  await api.functional.shoppingMall.admin.sellerApprovalRequests.update(
    adminConnection,
    {
      requestId: request1.id,
      body: {
        status: "approved",
      } satisfies IShoppingMallSellerApprovalRequest.IUpdate,
    },
  );
  // 6. Reject second request
  await api.functional.shoppingMall.admin.sellerApprovalRequests.update(
    adminConnection,
    {
      requestId: request2.id,
      body: {
        status: "rejected",
        rejection_reason: "Incomplete business information provided",
      } satisfies IShoppingMallSellerApprovalRequest.IUpdate,
    },
  );
  // 7. Test filtering by 'pending' status
  const pendingResult =
    await api.functional.shoppingMall.admin.sellerApprovalRequests.index(
      adminConnection,
      {
        body: {
          status: "pending",
        } satisfies IShoppingMallSellerApprovalRequest.IRequest,
      },
    );
  typia.assert(pendingResult);
  TestValidator.equals(
    "pending filter returns correct count",
    pendingResult.data.length,
    1,
  );
  TestValidator.equals(
    "pending filter returns request3",
    pendingResult.data[0].id,
    request3.id,
  );
  TestValidator.predicate(
    "pending request has null responded_at",
    pendingResult.data[0].responded_at === null,
  );
  // 8. Test filtering by 'approved' status
  const approvedResult =
    await api.functional.shoppingMall.admin.sellerApprovalRequests.index(
      adminConnection,
      {
        body: {
          status: "approved",
        } satisfies IShoppingMallSellerApprovalRequest.IRequest,
      },
    );
  typia.assert(approvedResult);
  TestValidator.equals(
    "approved filter returns correct count",
    approvedResult.data.length,
    1,
  );
  TestValidator.equals(
    "approved filter returns request1",
    approvedResult.data[0].id,
    request1.id,
  );
  TestValidator.predicate(
    "approved request has responded_at populated",
    approvedResult.data[0].responded_at !== null,
  );
  // 9. Test filtering by 'rejected' status
  const rejectedResult =
    await api.functional.shoppingMall.admin.sellerApprovalRequests.index(
      adminConnection,
      {
        body: {
          status: "rejected",
        } satisfies IShoppingMallSellerApprovalRequest.IRequest,
      },
    );
  typia.assert(rejectedResult);
  TestValidator.equals(
    "rejected filter returns correct count",
    rejectedResult.data.length,
    1,
  );
  TestValidator.equals(
    "rejected filter returns request2",
    rejectedResult.data[0].id,
    request2.id,
  );
  TestValidator.predicate(
    "rejected request has responded_at populated",
    rejectedResult.data[0].responded_at !== null,
  );
  // 10. Verify pagination metadata reflects filtered results
  TestValidator.equals(
    "pending pagination records matches data length",
    pendingResult.pagination.records,
    pendingResult.data.length,
  );
  TestValidator.equals(
    "approved pagination records matches data length",
    approvedResult.pagination.records,
    approvedResult.data.length,
  );
  TestValidator.equals(
    "rejected pagination records matches data length",
    rejectedResult.pagination.records,
    rejectedResult.data.length,
  );
}
