import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallPostPurchaseCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallPostPurchaseCancellationRequest";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerProfile";
import type { IShoppingMallMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallMember";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import type { IShoppingMallPostPurchaseCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPostPurchaseCancellationRequest";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipment";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

/**
 * Test administrator filtering of post-purchase cancellation requests by workflow status.
 *
 * Validates the cancellation request filtering functionality by testing status-based queries. Ensures that the endpoint correctly accepts status filter parameters and returns properly structured responses with accurate pagination metadata.
 *
 * The test verifies type safety of responses and validates that all returned cancellation requests match the queried status value. Since cancellation request creation is not available in the provided API functions, this test focuses on the filtering and response structure validation aspects.
 *
 * 1. Administrator account is created and authenticated via authorize_admin_join utility.
 * 2. Admin calls PATCH endpoint with filter { status: 'pending' } and validates response structure.
 * 3. Admin calls endpoint with filter { status: 'approved' } and validates response structure.
 * 4. Admin calls endpoint with filter { status: 'rejected' } and validates response structure.
 * 5. For each filtered response, validates that pagination metadata is correct and all returned items match the queried status.
 * 6. Validates pagination works correctly with status filter applied by testing with different limit values.
 */
export async function test_api_post_purchase_cancellation_request_filter_by_status(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create and authenticate administrator
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      grade: RandomGenerator.pick(["regular", "super"] as const),
    } satisfies IShoppingMallAdmin.IJoin,
  });
  // 2. Test filtering by 'pending' status
  const pendingResponse =
    await api.functional.shoppingMall.admin.post_purchase.cancellation_requests.index(
      adminConnection,
      {
        body: {
          status: "pending",
          page: 1,
          limit: 10,
        } satisfies IShoppingMallPostPurchaseCancellationRequest.IRequest,
      },
    );
  typia.assert(pendingResponse);
  // Validate pagination structure
  TestValidator.equals(
    "pending page number",
    pendingResponse.pagination.current,
    1,
  );
  TestValidator.equals("pending limit", pendingResponse.pagination.limit, 10);
  // Validate all returned items have pending status
  for (const request of pendingResponse.data) {
    TestValidator.equals("pending item status", request.status, "pending");
  }
  // 3. Test filtering by 'approved' status
  const approvedResponse =
    await api.functional.shoppingMall.admin.post_purchase.cancellation_requests.index(
      adminConnection,
      {
        body: {
          status: "approved",
          page: 1,
          limit: 10,
        } satisfies IShoppingMallPostPurchaseCancellationRequest.IRequest,
      },
    );
  typia.assert(approvedResponse);
  TestValidator.equals(
    "approved page number",
    approvedResponse.pagination.current,
    1,
  );
  TestValidator.equals("approved limit", approvedResponse.pagination.limit, 10);
  // Validate all returned items have approved status
  for (const request of approvedResponse.data) {
    TestValidator.equals("approved item status", request.status, "approved");
  }
  // 4. Test filtering by 'rejected' status
  const rejectedResponse =
    await api.functional.shoppingMall.admin.post_purchase.cancellation_requests.index(
      adminConnection,
      {
        body: {
          status: "rejected",
          page: 1,
          limit: 10,
        } satisfies IShoppingMallPostPurchaseCancellationRequest.IRequest,
      },
    );
  typia.assert(rejectedResponse);
  TestValidator.equals(
    "rejected page number",
    rejectedResponse.pagination.current,
    1,
  );
  TestValidator.equals("rejected limit", rejectedResponse.pagination.limit, 10);
  // Validate all returned items have rejected status
  for (const request of rejectedResponse.data) {
    TestValidator.equals("rejected item status", request.status, "rejected");
  }
  // 5. Test pagination with different limit values
  const paginatedResponse =
    await api.functional.shoppingMall.admin.post_purchase.cancellation_requests.index(
      adminConnection,
      {
        body: {
          status: "pending",
          page: 1,
          limit: 5,
        } satisfies IShoppingMallPostPurchaseCancellationRequest.IRequest,
      },
    );
  typia.assert(paginatedResponse);
  TestValidator.equals(
    "paginated limit",
    paginatedResponse.pagination.limit,
    5,
  );
  TestValidator.predicate(
    "paginated records count valid",
    paginatedResponse.pagination.records >= 0,
  );
  TestValidator.predicate(
    "paginated pages count valid",
    paginatedResponse.pagination.pages >= 0,
  );
  // 6. Validate status filtering is mutually exclusive
  const pendingIds = new Set(pendingResponse.data.map((r) => r.id));
  const approvedIds = new Set(approvedResponse.data.map((r) => r.id));
  const rejectedIds = new Set(rejectedResponse.data.map((r) => r.id));
  // Check no overlap between status groups
  for (const id of pendingIds) {
    TestValidator.predicate("pending not in approved", !approvedIds.has(id));
    TestValidator.predicate("pending not in rejected", !rejectedIds.has(id));
  }
  for (const id of approvedIds) {
    TestValidator.predicate("approved not in rejected", !rejectedIds.has(id));
  }
}
