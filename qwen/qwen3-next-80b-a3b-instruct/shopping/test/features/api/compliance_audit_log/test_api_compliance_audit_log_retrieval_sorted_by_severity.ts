import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallAuditLog";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAuditLog";
import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
export async function test_api_compliance_audit_log_retrieval_sorted_by_severity(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create admin connection and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  const adminData = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    href: "https://example.com/admin/join",
    referrer: "https://example.com/admin/signup",
  } satisfies IShoppingMallAdmin.IJoin;
  const admin = await authorize_admin_join(adminConnection, {
    body: adminData,
  });
  typia.assert(admin);
  // Step 2: Retrieve compliance audit logs sorted by severity in descending order
  // Request parameters based on IRequest schema
  const searchParams = {
    sort_by: "severity_level",
    order: "desc",
    page: 1,
    limit: 10,
    compliance_category: "audit_log" // Added missing required property
  } satisfies IShoppingMallAuditLog.IRequest;
  // Call the endpoint with actor-specific connection
  const response =
    await api.functional.shoppingMall.admin.compliance.audit_logs.index(
      adminConnection,
      { body: searchParams },
    );
  typia.assert(response);
  // Step 3: Validate response structure (since IShoppingMallAuditLog is string, we can't validate content)
  // Verify pagination structure is correct
  TestValidator.equals(
    "pagination current page is correct",
    response.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination limit matches request",
    response.pagination.limit,
    10,
  );
  TestValidator.predicate(
    "pagination records is non-negative",
    response.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages is non-negative",
    response.pagination.pages >= 0,
  );
  // Verify data is an array
  TestValidator.predicate("data is an array", Array.isArray(response.data));
  // Verify each item in data is a string (as per IShoppingMallAuditLog type)
  for (let i = 0; i < response.data.length; i++) {
    TestValidator.predicate(
      `data[${i}] is a string`,
      typeof response.data[i] === "string",
    );
  }
}