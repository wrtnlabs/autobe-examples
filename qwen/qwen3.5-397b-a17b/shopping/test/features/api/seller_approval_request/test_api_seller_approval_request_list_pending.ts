import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallSellerApprovalRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallSellerApprovalRequest";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerProfile";
import type { IShoppingMallMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallMember";
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

/**
 * Test administrator retrieval of pending seller approval requests with pagination.
 *
 * Validates the complete workflow for administrators to browse seller approval requests awaiting review. The test ensures that pending requests are properly filtered, seller information is correctly joined, and unreviewed requests have null reviewedByAdmin fields.
 *
 * The test creates a seller account which automatically generates a pending approval request, then verifies that administrators can retrieve and filter these requests using the approval requests listing endpoint.
 *
 * 1. Administrator registers and authenticates via admin join endpoint.
 * 2. Seller registers via seller join endpoint creating pending approval request.
 * 3. Administrator calls approval requests index with status='pending' filter.
 * 4. Validates response structure matches IPageIShoppingMallSellerApprovalRequest.ISummary.
 * 5. Verifies all returned requests have status='pending' and reviewedByAdmin is null.
 * 6. Confirms seller details are properly included in each request summary.
 * 7. Validates pagination metadata includes current, limit, records, and pages fields.
 */
export async function test_api_seller_approval_request_list_pending(
  connection: api.IConnection,
): Promise<void> {
  // 1. Administrator setup - create admin account and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      grade: RandomGenerator.pick(["regular", "super"] as const),
    } satisfies IShoppingMallAdmin.IJoin,
  });
  typia.assert(adminAuth);
  // 2. Create seller account to generate pending approval request
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {
    body: {
      email: sellerEmail,
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IShoppingMallSeller.IJoin,
  });
  typia.assert(sellerAuth);
  // 3. Administrator retrieves pending approval requests
  const response =
    await api.functional.shoppingMall.seller.approval_requests.index(
      adminConnection,
      {
        body: {
          status: "pending",
          page: 1,
          limit: 20,
        } satisfies IShoppingMallSellerApprovalRequest.IRequest,
      },
    );
  typia.assert(response);
  // 4. Validate pagination metadata
  TestValidator.predicate(
    "pagination exists",
    response.pagination !== undefined,
  );
  TestValidator.predicate(
    "current page is 1",
    response.pagination.current >= 1,
  );
  TestValidator.predicate("limit is positive", response.pagination.limit > 0);
  TestValidator.predicate(
    "records count is non-negative",
    response.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pages count is non-negative",
    response.pagination.pages >= 0,
  );
  // 5. Validate at least one pending request exists (the seller we just created)
  TestValidator.predicate(
    "has at least one pending request",
    response.data.length >= 1,
  );
  // 6. Validate all returned requests have status='pending' and business logic
  for (const request of response.data) {
    TestValidator.equals(
      "request status is pending",
      request.status,
      "pending",
    );
    // 7. Validate reviewedByAdmin is null for pending requests (not yet reviewed)
    TestValidator.predicate(
      "reviewedByAdmin is null for pending",
      request.reviewedByAdmin === null || request.reviewedByAdmin === undefined,
    );
    // 8. Validate seller information is present and correct
    TestValidator.predicate(
      "seller exists in request",
      request.seller !== undefined,
    );
    // 9. Validate timestamps exist
    TestValidator.predicate(
      "createdAt exists",
      request.createdAt !== undefined,
    );
    TestValidator.predicate(
      "updatedAt exists",
      request.updatedAt !== undefined,
    );
  }
  // 10. Validate the newly created seller's request is in the results
  const newSellerRequest = response.data.find(
    (r) => r.seller.email === sellerEmail,
  );
  TestValidator.predicate(
    "new seller request found in results",
    newSellerRequest !== undefined,
  );
  if (newSellerRequest) {
    TestValidator.equals(
      "seller email matches created seller",
      newSellerRequest.seller.email,
      sellerEmail,
    );
    TestValidator.equals(
      "seller approval status is pending",
      newSellerRequest.seller.approvalStatus,
      "pending",
    );
  }
  // 11. Validate results are sorted by createdAt descending (newest first)
  if (response.data.length >= 2) {
    for (let i = 1; i < response.data.length; i++) {
      const prevDate = new Date(response.data[i - 1].createdAt).getTime();
      const currDate = new Date(response.data[i].createdAt).getTime();
      TestValidator.predicate(
        `sorted by createdAt desc at index ${i}`,
        prevDate >= currDate,
      );
    }
  }
}
