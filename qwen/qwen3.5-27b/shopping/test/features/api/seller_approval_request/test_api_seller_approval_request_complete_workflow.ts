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
 * Test the complete seller approval request workflow.
 *
 * This test validates the seller approval process:
 * 1. Admin registration and authentication
 * 2. Seller registration and authentication
 * 3. Seller approval request submission
 * 4. Admin listing and filtering pending requests
 * 5. Verification of request status and seller approval status
 * 6. Pagination and filtering functionality
 */
export async function test_api_seller_approval_request_complete_workflow(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate admin
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(admin);
  // 2. Register and authenticate seller
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      shop_name: RandomGenerator.name(2),
      shop_description: RandomGenerator.paragraph({ sentences: 3 }),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(seller);
  // 3. Submit seller approval request
  const approvalRequest =
    await generate_random_shopping_mall_seller_seller_approval_requests_create(
      sellerConnection,
      {
        body: {
          reason: RandomGenerator.paragraph({ sentences: 5 }),
        },
      },
    );
  typia.assert(approvalRequest);
  // Store request ID and seller email for verification
  const requestId = approvalRequest.id;
  const sellerEmail = seller.email;
  const submittedAt = approvalRequest.submitted_at;
  // 4. Admin lists all pending requests
  const pendingRequests =
    await api.functional.shoppingMall.admin.seller_approval_requests.index(
      adminConnection,
      {
        body: {
          status: "pending",
          page: 1,
          limit: 20,
        } satisfies IShoppingMallSellerApprovalRequest.IRequest,
      },
    );
  typia.assert(pendingRequests);
  // Verify the newly created request appears in pending list
  const pendingRequest = pendingRequests.data.find(
    (req) => req.id === requestId,
  );
  TestValidator.predicate(
    "pending request exists in list",
    pendingRequest !== undefined,
  );
  // Validate pending request properties
  if (pendingRequest) {
    TestValidator.equals(
      "pending request status",
      pendingRequest.status,
      "pending",
    );
    TestValidator.equals(
      "pending request responded_at is null",
      pendingRequest.responded_at,
      null,
    );
    TestValidator.equals(
      "pending seller approval_status",
      pendingRequest.seller.approval_status,
      "pending",
    );
    TestValidator.equals(
      "pending request reason matches",
      pendingRequest.reason,
      approvalRequest.reason,
    );
    TestValidator.equals(
      "pending request submitted_at matches",
      pendingRequest.submitted_at,
      submittedAt,
    );
  }
  // 5. Verify pagination metadata
  TestValidator.predicate(
    "pending requests pagination current page is valid",
    pendingRequests.pagination.current >= 1,
  );
  TestValidator.predicate(
    "pending requests pagination limit is valid",
    pendingRequests.pagination.limit >= 1 &&
      pendingRequests.pagination.limit <= 100,
  );
  TestValidator.predicate(
    "pending requests total count is non-negative",
    pendingRequests.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pending requests data length matches page limit or total",
    pendingRequests.data.length <= pendingRequests.pagination.limit,
  );
  // 6. Test filtering by seller email
  const filteredBySellerEmail =
    await api.functional.shoppingMall.admin.seller_approval_requests.index(
      adminConnection,
      {
        body: {
          status: "pending",
          sellerEmail: sellerEmail,
          page: 1,
          limit: 20,
        } satisfies IShoppingMallSellerApprovalRequest.IRequest,
      },
    );
  typia.assert(filteredBySellerEmail);
  TestValidator.predicate(
    "filtered request exists in results",
    filteredBySellerEmail.data.some((req) => req.id === requestId),
  );
  const filteredRequest = filteredBySellerEmail.data.find(
    (req) => req.id === requestId,
  );
  if (filteredRequest) {
    TestValidator.equals(
      "filtered request seller email matches",
      filteredRequest.seller.email,
      sellerEmail,
    );
  }
  // 7. Test filtering by shop name
  const shopName = seller.shop_name;
  const filteredByShopName =
    await api.functional.shoppingMall.admin.seller_approval_requests.index(
      adminConnection,
      {
        body: {
          status: "pending",
          shopName: shopName,
          page: 1,
          limit: 20,
        } satisfies IShoppingMallSellerApprovalRequest.IRequest,
      },
    );
  typia.assert(filteredByShopName);
  TestValidator.predicate(
    "shop name filtered request exists",
    filteredByShopName.data.some((req) => req.id === requestId),
  );
  // 8. List approved requests (should not contain our pending request)
  const approvedRequests =
    await api.functional.shoppingMall.admin.seller_approval_requests.index(
      adminConnection,
      {
        body: {
          status: "approved",
          page: 1,
          limit: 20,
        } satisfies IShoppingMallSellerApprovalRequest.IRequest,
      },
    );
  typia.assert(approvedRequests);
  TestValidator.predicate(
    "pending request not in approved list",
    !approvedRequests.data.some((req) => req.id === requestId),
  );
  // 9. List rejected requests (should not contain our pending request)
  const rejectedRequests =
    await api.functional.shoppingMall.admin.seller_approval_requests.index(
      adminConnection,
      {
        body: {
          status: "rejected",
          page: 1,
          limit: 20,
        } satisfies IShoppingMallSellerApprovalRequest.IRequest,
      },
    );
  typia.assert(rejectedRequests);
  TestValidator.predicate(
    "pending request not in rejected list",
    !rejectedRequests.data.some((req) => req.id === requestId),
  );
  // 10. Test date range filtering (submittedAfter)
  const filteredByDate =
    await api.functional.shoppingMall.admin.seller_approval_requests.index(
      adminConnection,
      {
        body: {
          status: "pending",
          submittedAfter: submittedAt,
          page: 1,
          limit: 20,
        } satisfies IShoppingMallSellerApprovalRequest.IRequest,
      },
    );
  typia.assert(filteredByDate);
  TestValidator.predicate(
    "request exists in date-filtered results",
    filteredByDate.data.some((req) => req.id === requestId),
  );
  // 11. Verify seller summary data in request
  if (pendingRequest) {
    TestValidator.equals(
      "seller id matches",
      pendingRequest.seller.id,
      seller.id,
    );
    TestValidator.equals(
      "seller shop_name matches",
      pendingRequest.seller.shop_name,
      seller.shop_name,
    );
    TestValidator.equals(
      "seller status is active",
      pendingRequest.seller.status,
      "active",
    );
  }
}
