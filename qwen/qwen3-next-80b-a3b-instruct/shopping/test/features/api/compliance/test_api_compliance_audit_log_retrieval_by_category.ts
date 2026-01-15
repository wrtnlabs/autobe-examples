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
export async function test_api_compliance_audit_log_retrieval_by_category(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create a new connection and authenticate as admin
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: "https://example.com/admin/join" satisfies string &
        tags.Format<"uri">,
      referrer: "https://example.com/admin/signup" satisfies string &
        tags.Format<"uri">,
    } satisfies IShoppingMallAdmin.IJoin,
  });
  // Step 2: Create a unique compliance category for testing
  const testCategory = `category_${RandomGenerator.alphaNumeric(8)}`;
  // Step 3: Create audit log request with the unique compliance category
  const auditLogRequest: IShoppingMallAuditLog.IRequest = {
    compliance_category: testCategory,
    page: 1,
    limit: 25,
  } satisfies IShoppingMallAuditLog.IRequest;
  // Step 4: Call the audit logs index endpoint with admin connection
  const response: IPageIShoppingMallAuditLog =
    await api.functional.shoppingMall.admin.compliance.audit_logs.index(
      adminConnection,
      { body: auditLogRequest },
    );
  // Step 5: Validate response structure with typia.assert
  typia.assert<IPageIShoppingMallAuditLog>(response);
  // Step 6: Validate pagination information
  TestValidator.equals(
    "pagination page should be 1",
    response.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination limit should be 25",
    response.pagination.limit,
    25,
  );
  TestValidator.predicate(
    "pagination records should be greater than or equal to 0",
    response.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages should be greater than or equal to 0",
    response.pagination.pages >= 0,
  );
  // Step 7: Validate that data array exists and has at least one item
  TestValidator.predicate(
    "data array should not be empty",
    response.data.length > 0,
  );
  // Step 8: Validate that all records in data array have the requested compliance category
  // Since IShoppingMallAuditLog is a string type, we need to parse it as JSON
  // to access the compliance_category property that exists within the serialized object
  response.data.forEach((log) => {
    // Parse the audit log string as JSON to extract its properties
    const logObject = JSON.parse(log);
    // Validate the compliance_category property exists in the parsed object
    TestValidator.equals(
      "each log should have compliance_category matching request",
      logObject.compliance_category,
      testCategory,
    );
  });
}
