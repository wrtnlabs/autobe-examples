import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallAdminRequestRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdminRequestRequest";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallAdminRequestRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallAdminRequestRequest";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_admin_requests_index_super_admin(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as super administrator
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_login(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234",
    },
  });
  // 2. Test index endpoint with various filter combinations
  const defaultRequest: IEcommerceMallAdminRequestRequest.IRequest = {
    page: 1,
    limit: 20,
    sort_by: "created_at",
    sort_order: "descending",
  };
  // Test 1: Filter by status - pending only
  const pendingFilter: IEcommerceMallAdminRequestRequest.IRequest = {
    ...defaultRequest,
    request_status: ["pending"] as const,
  };
  const pendingResponse =
    await api.functional.ecommerceMall.admin.admin_requests.index(
      adminConnection,
      { body: pendingFilter },
    );
  typia.assert(pendingResponse);
  // Test 2: Filter by requester type - customer only
  const customerFilter: IEcommerceMallAdminRequestRequest.IRequest = {
    ...defaultRequest,
    requester_type: ["customer"] as const,
  };
  const customerResponse =
    await api.functional.ecommerceMall.admin.admin_requests.index(
      adminConnection,
      { body: customerFilter },
    );
  typia.assert(customerResponse);
  // Test 3: Combined filters - status=pending AND requester_type=customer
  const combinedFilter: IEcommerceMallAdminRequestRequest.IRequest = {
    ...defaultRequest,
    request_status: ["pending"] as const,
    requester_type: ["customer"] as const,
  };
  const combinedResponse =
    await api.functional.ecommerceMall.admin.admin_requests.index(
      adminConnection,
      { body: combinedFilter },
    );
  typia.assert(combinedResponse);
  // Test 4: Filter by date range
  const now = new Date();
  const fromDate = new Date(
    now.getTime() - 1000 * 60 * 60 * 24 * 30,
  ).toISOString();
  const toDate = new Date().toISOString();
  const dateRangeFilter: IEcommerceMallAdminRequestRequest.IRequest = {
    ...defaultRequest,
    from_date: fromDate,
    to_date: toDate,
  };
  const dateResponse =
    await api.functional.ecommerceMall.admin.admin_requests.index(
      adminConnection,
      { body: dateRangeFilter },
    );
  typia.assert(dateResponse);
  // Test 5: Test sorting - ascending order
  const ascendingSort: IEcommerceMallAdminRequestRequest.IRequest = {
    ...defaultRequest,
    sort_by: "created_at",
    sort_order: "ascending",
  };
  const ascendingResponse =
    await api.functional.ecommerceMall.admin.admin_requests.index(
      adminConnection,
      { body: ascendingSort },
    );
  typia.assert(ascendingResponse);
  // Test 6: Test pagination - different page size and page number
  const paginationRequest: IEcommerceMallAdminRequestRequest.IRequest = {
    page: 2,
    limit: 5,
  };
  const paginationResponse =
    await api.functional.ecommerceMall.admin.admin_requests.index(
      adminConnection,
      { body: paginationRequest },
    );
  typia.assert(paginationResponse);
  // Test 7: Test status filtering - approved only
  const approvedFilter: IEcommerceMallAdminRequestRequest.IRequest = {
    ...defaultRequest,
    request_status: ["approved"] as const,
  };
  const approvedResponse =
    await api.functional.ecommerceMall.admin.admin_requests.index(
      adminConnection,
      { body: approvedFilter },
    );
  typia.assert(approvedResponse);
  // Test 8: Test status filtering - rejected only
  const rejectedFilter: IEcommerceMallAdminRequestRequest.IRequest = {
    ...defaultRequest,
    request_status: ["rejected"] as const,
  };
  const rejectedResponse =
    await api.functional.ecommerceMall.admin.admin_requests.index(
      adminConnection,
      { body: rejectedFilter },
    );
  typia.assert(rejectedResponse);
  // Validate response structures
  TestValidator.equals(
    "pending response pagination current",
    pendingResponse.pagination.current,
    1,
  );
  TestValidator.equals(
    "pending response pagination limit",
    pendingResponse.pagination.limit,
    20,
  );
  TestValidator.equals(
    "customer response pagination current",
    customerResponse.pagination.current,
    1,
  );
  TestValidator.equals(
    "customer response pagination limit",
    customerResponse.pagination.limit,
    20,
  );
  TestValidator.equals(
    "combined response pagination current",
    combinedResponse.pagination.current,
    1,
  );
  TestValidator.equals(
    "combined response pagination limit",
    combinedResponse.pagination.limit,
    20,
  );
  TestValidator.equals(
    "date response pagination current",
    dateResponse.pagination.current,
    1,
  );
  TestValidator.equals(
    "date response pagination limit",
    dateResponse.pagination.limit,
    20,
  );
  TestValidator.equals(
    "ascending response pagination current",
    ascendingResponse.pagination.current,
    1,
  );
  TestValidator.equals(
    "ascending response pagination limit",
    ascendingResponse.pagination.limit,
    20,
  );
  TestValidator.equals(
    "pagination response pagination current",
    paginationResponse.pagination.current,
    2,
  );
  TestValidator.equals(
    "pagination response pagination limit",
    paginationResponse.pagination.limit,
    5,
  );
  TestValidator.equals(
    "approved response pagination current",
    approvedResponse.pagination.current,
    1,
  );
  TestValidator.equals(
    "approved response pagination limit",
    approvedResponse.pagination.limit,
    20,
  );
  TestValidator.equals(
    "rejected response pagination current",
    rejectedResponse.pagination.current,
    1,
  );
  TestValidator.equals(
    "rejected response pagination limit",
    rejectedResponse.pagination.limit,
    20,
  );
  // Validate data array is present
  TestValidator.predicate(
    "pending response has data array",
    Array.isArray(pendingResponse.data),
  );
  TestValidator.predicate(
    "customer response has data array",
    Array.isArray(customerResponse.data),
  );
  TestValidator.predicate(
    "combined response has data array",
    Array.isArray(combinedResponse.data),
  );
  // Validate each request has correct structure
  pendingResponse.data.forEach((request, index) => {
    validateRequestSummary(request, `pending response item ${index}`);
  });
  customerResponse.data.forEach((request, index) => {
    validateRequestSummary(request, `customer response item ${index}`);
  });
  combinedResponse.data.forEach((request, index) => {
    validateRequestSummary(request, `combined response item ${index}`);
  });
}
function validateRequestSummary(
  request: IEcommerceMallAdminRequestRequest.ISummary,
  title: string,
): void {
  typia.assert(request);
  // Validate required fields exist and are not null/undefined
  TestValidator.notEquals(`${title} id`, request.id, null);
  TestValidator.notEquals(`${title} reason`, request.reason, null);
  TestValidator.notEquals(`${title} status`, request.request_status, null);
  TestValidator.notEquals(`${title} created_at`, request.created_at, null);
  TestValidator.notEquals(`${title} updated_at`, request.updated_at, null);
  // Validate requester type (either customer or seller should be present)
  if (request.customer) {
    typia.assert(request.customer);
    TestValidator.notEquals(`${title} customer id`, request.customer.id, null);
  }
  if (request.seller) {
    typia.assert(request.seller);
    TestValidator.notEquals(`${title} seller id`, request.seller.id, null);
  }
}
