import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallAdminRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdminRequest";
import type { IEcommerceMallSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSuperAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallAdminRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallAdminRequest";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_admin_request_list_retrieval(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as administrator
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {});
  // 2. Retrieve paginated list of admin requests with default pagination
  const defaultResponse =
    await api.functional.ecommerceMall.admin.admin.requests.index(
      adminConnection,
      {
        body: {} satisfies IEcommerceMallAdminRequest.IRequest,
      },
    );
  typia.assert(defaultResponse);
  // 3. Validate pagination metadata structure
  TestValidator.equals(
    "current page is 1",
    defaultResponse.pagination.current,
    1,
  );
  TestValidator.equals(
    "limit is defined",
    defaultResponse.pagination.limit >= 1,
    true,
  );
  TestValidator.equals(
    "records is non-negative",
    defaultResponse.pagination.records >= 0,
    true,
  );
  TestValidator.equals(
    "pages is non-negative",
    defaultResponse.pagination.pages >= 0,
    true,
  );
  TestValidator.equals(
    "data array exists",
    Array.isArray(defaultResponse.data),
    true,
  );
  // 4. Validate data items structure (if any exist)
  if (defaultResponse.data.length > 0) {
    const firstRequest = defaultResponse.data[0];
    TestValidator.equals(
      "id exists",
      firstRequest.id !== null && firstRequest.id !== undefined,
      true,
    );
    TestValidator.equals(
      "actor_type exists",
      firstRequest.actor_type !== null && firstRequest.actor_type !== undefined,
      true,
    );
    TestValidator.equals(
      "requested_grade exists",
      firstRequest.requested_grade !== null &&
        firstRequest.requested_grade !== undefined,
      true,
    );
    TestValidator.equals(
      "status exists",
      firstRequest.status !== null && firstRequest.status !== undefined,
      true,
    );
    TestValidator.equals(
      "created_at exists",
      firstRequest.created_at !== null && firstRequest.created_at !== undefined,
      true,
    );
  }
  // 5. Test with custom pagination parameters
  const paginatedResponse =
    await api.functional.ecommerceMall.admin.admin.requests.index(
      adminConnection,
      {
        body: {
          page: 1,
          limit: 5,
        } satisfies IEcommerceMallAdminRequest.IRequest,
      },
    );
  typia.assert(paginatedResponse);
  // 6. Validate custom pagination is respected
  TestValidator.equals(
    "custom limit is respected",
    paginatedResponse.pagination.limit,
    5,
  );
  TestValidator.equals(
    "custom page is respected",
    paginatedResponse.pagination.current,
    1,
  );
  TestValidator.equals(
    "records count is consistent",
    defaultResponse.pagination.records,
    paginatedResponse.pagination.records,
  );
  // 7. Test filtering by status (pending requests)
  const pendingResponse =
    await api.functional.ecommerceMall.admin.admin.requests.index(
      adminConnection,
      {
        body: {
          status: "pending",
        } satisfies IEcommerceMallAdminRequest.IRequest,
      },
    );
  typia.assert(pendingResponse);
  // 8. Validate filtered results (if any)
  if (pendingResponse.data.length > 0) {
    const allPending = pendingResponse.data.every(
      (req) => req.status === "pending",
    );
    TestValidator.equals("all results are pending", allPending, true);
  }
  // 9. Test filtering by actor_type
  const customerResponse =
    await api.functional.ecommerceMall.admin.admin.requests.index(
      adminConnection,
      {
        body: {
          actor_type: "customer",
        } satisfies IEcommerceMallAdminRequest.IRequest,
      },
    );
  typia.assert(customerResponse);
  // 10. Validate filtered results (if any)
  if (customerResponse.data.length > 0) {
    const allCustomer = customerResponse.data.every(
      (req) => req.actor_type === "customer",
    );
    TestValidator.equals(
      "all results are customer requests",
      allCustomer,
      true,
    );
  }
  // 11. Test filtering by requested_grade
  const adminGradeResponse =
    await api.functional.ecommerceMall.admin.admin.requests.index(
      adminConnection,
      {
        body: {
          requested_grade: "admin",
        } satisfies IEcommerceMallAdminRequest.IRequest,
      },
    );
  typia.assert(adminGradeResponse);
  // 12. Validate filtered results (if any)
  if (adminGradeResponse.data.length > 0) {
    const allAdminGrade = adminGradeResponse.data.every(
      (req) => req.requested_grade === "admin",
    );
    TestValidator.equals(
      "all results are admin grade requests",
      allAdminGrade,
      true,
    );
  }
}
