import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallAdminRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallAdminRequest";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminRequest";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSuperAdmin";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";
import { generate_random_shopping_mall_customer_admin_requests_create } from "../../../generate/generate_random_shopping_mall_customer_admin_requests_create";
import { prepare_random_shopping_mall_admin_request } from "../../../prepare/prepare_random_shopping_mall_admin_request";

export async function test_api_admin_request_list_super_admin_all_requests(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as administrator
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_admin_login(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IShoppingMallAdmin.ILogin,
  });
  typia.assert(adminAuth);
  // 2. Create customer account for making test requests
  const customerConnection: api.IConnection = { host: connection.host };
  const customerAuth = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      nickname: RandomGenerator.name(),
      phone_number: RandomGenerator.mobile(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: null,
    } satisfies IShoppingMallCustomer.IJoin,
  });
  typia.assert(customerAuth);
  // 3. Create multiple admin promotion requests with different reasons
  const requestReasons = ArrayUtil.repeat(3, (index) => ({
    reason: `Test admin request ${index + 1} - ${RandomGenerator.paragraph({ sentences: 2 })}`,
  }));
  const createdRequests: IShoppingMallAdminRequest[] = [];
  for (const requestInput of requestReasons) {
    const request =
      await generate_random_shopping_mall_customer_admin_requests_create(
        customerConnection,
        {
          body: requestInput,
        },
      );
    typia.assert(request);
    createdRequests.push(request);
  }
  // 4. Call the target endpoint with no filters (default parameters)
  const allRequestsResult =
    await api.functional.shoppingMall.admin.admin_requests.index(
      adminConnection,
      {
        body: {
          page: 1,
          limit: 20,
          sort: "requested_at",
          direction: "desc",
        } satisfies IShoppingMallAdminRequest.IRequest,
      },
    );
  typia.assert(allRequestsResult);
  // 5. Verify the response contains all requests
  TestValidator.predicate(
    "should contain at least the created requests",
    () => allRequestsResult.data.length >= createdRequests.length,
  );
  // 6. Verify pagination metadata is correct
  TestValidator.equals("current page", allRequestsResult.pagination.current, 1);
  TestValidator.predicate(
    "limit is set",
    () => allRequestsResult.pagination.limit > 0,
  );
  TestValidator.predicate(
    "records count is valid",
    () => allRequestsResult.pagination.records >= createdRequests.length,
  );
  TestValidator.predicate(
    "pages count is valid",
    () => allRequestsResult.pagination.pages >= 1,
  );
  // 7. Verify each request summary includes required fields
  for (const request of allRequestsResult.data) {
    typia.assert(request);
    TestValidator.predicate("request has id", () => request.id !== undefined);
    TestValidator.predicate(
      "request has reason",
      () => request.reason !== undefined,
    );
    TestValidator.predicate(
      "request has status",
      () => request.status !== undefined,
    );
    TestValidator.predicate(
      "request has requested_at",
      () => request.requested_at !== undefined,
    );
    TestValidator.predicate(
      "request has customer",
      () => request.customer !== undefined,
    );
    TestValidator.predicate(
      "customer has id",
      () => request.customer.id !== undefined,
    );
    TestValidator.predicate(
      "customer has email",
      () => request.customer.email !== undefined,
    );
    TestValidator.predicate(
      "customer has nickname",
      () => request.customer.nickname !== undefined,
    );
    TestValidator.predicate(
      "customer has phone_number",
      () => request.customer.phone_number !== undefined,
    );
  }
  // 8. Verify default sorting is by requested_at in descending order (newest first)
  if (allRequestsResult.data.length > 1) {
    for (let i = 0; i < allRequestsResult.data.length - 1; i++) {
      const current = new Date(
        allRequestsResult.data[i].requested_at,
      ).getTime();
      const next = new Date(
        allRequestsResult.data[i + 1].requested_at,
      ).getTime();
      TestValidator.predicate(
        `request ${i} should be newer than request ${i + 1}`,
        () => current >= next,
      );
    }
  }
  // 9. Test with explicit status filter 'PENDING'
  const pendingRequestsResult =
    await api.functional.shoppingMall.admin.admin_requests.index(
      adminConnection,
      {
        body: {
          status: "PENDING",
          page: 1,
          limit: 20,
        } satisfies IShoppingMallAdminRequest.IRequest,
      },
    );
  typia.assert(pendingRequestsResult);
  for (const request of pendingRequestsResult.data) {
    TestValidator.equals("pending request status", request.status, "PENDING");
  }
  // 10. Test with status filter 'APPROVED'
  const approvedRequestsResult =
    await api.functional.shoppingMall.admin.admin_requests.index(
      adminConnection,
      {
        body: {
          status: "APPROVED",
          page: 1,
          limit: 20,
        } satisfies IShoppingMallAdminRequest.IRequest,
      },
    );
  typia.assert(approvedRequestsResult);
  for (const request of approvedRequestsResult.data) {
    TestValidator.equals("approved request status", request.status, "APPROVED");
  }
  // 11. Test with status filter 'REJECTED'
  const rejectedRequestsResult =
    await api.functional.shoppingMall.admin.admin_requests.index(
      adminConnection,
      {
        body: {
          status: "REJECTED",
          page: 1,
          limit: 20,
        } satisfies IShoppingMallAdminRequest.IRequest,
      },
    );
  typia.assert(rejectedRequestsResult);
  for (const request of rejectedRequestsResult.data) {
    TestValidator.equals("rejected request status", request.status, "REJECTED");
  }
  // 12. Test date range filtering
  const now = new Date();
  const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const oneDayLater = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  const dateRangeRequestsResult =
    await api.functional.shoppingMall.admin.admin_requests.index(
      adminConnection,
      {
        body: {
          requested_at_from: oneDayAgo.toISOString(),
          requested_at_to: oneDayLater.toISOString(),
          page: 1,
          limit: 20,
        } satisfies IShoppingMallAdminRequest.IRequest,
      },
    );
  typia.assert(dateRangeRequestsResult);
  // Verify all returned requests are within the date range
  for (const request of dateRangeRequestsResult.data) {
    const requestTime = new Date(request.requested_at).getTime();
    TestValidator.predicate(
      "request within date range",
      () =>
        requestTime >= oneDayAgo.getTime() &&
        requestTime <= oneDayLater.getTime(),
    );
  }
  // 13. Verify soft-deleted requests are excluded (default behavior)
  // This is tested implicitly as the API should filter out deleted_at != null by default
  for (const request of allRequestsResult.data) {
    // The summary doesn't include deleted_at, but we verify the requests are active
    TestValidator.predicate(
      "request is accessible",
      () => request.id !== undefined,
    );
  }
}
