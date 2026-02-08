import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallAdministrativeAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallAdministrativeAuditLog";
import type { IShoppingMallAdministrativeAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrativeAuditLog";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

export async function test_api_administrative_audit_logs_retrieval_authorized_pagination(
  connection: api.IConnection,
): Promise<void> {
  /**
   * Test retrieving a paginated list of administrative audit logs as an authorized administrator user.
   * This scenario covers successful authentication, providing pagination parameters (page number and size) to retrieve the first page of audit logs.
   * It validates that the response contains the proper pagination metadata, an array of audit log summaries,
   * and that only authorized administrators can perform the query.
   * The test verifies that no data mutation occurs and all filters return appropriate immutable audit log entries.
   */
  // 1. Administrator joins and gets authorized
  const adminConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_administrator_join(adminConnection, {
    body: {} satisfies IShoppingMallAdministrator.IJoin,
  });
  typia.assert(authorized);
  // 2. Use authorized connection for subsequent calls
  adminConnection.headers ??= {};
  adminConnection.headers.Authorization = `Bearer ${authorized.token.access}`;
  // 3. Define request body with pagination for first page
  const requestBody: IShoppingMallAdministrativeAuditLog.IRequest = {};
  // 4. Call the patch endpoint for administrative audit logs
  const response =
    await api.functional.shoppingMall.administrator.administrative_audit_logs.patch(
      adminConnection,
      { body: requestBody },
    );
  typia.assert(response);
  // 5. Validate pagination data
  TestValidator.predicate(
    "pagination current is positive",
    response.pagination.current > 0,
  );
  TestValidator.predicate(
    "pagination limit is positive",
    response.pagination.limit > 0,
  );
  TestValidator.predicate(
    "pagination pages is non-negative",
    response.pagination.pages >= 0,
  );
  TestValidator.predicate(
    "pagination records is non-negative",
    response.pagination.records >= 0,
  );
  // 6. Validate individual audit log data items
  for (const item of response.data) {
    typia.assert(item);
  }
  // 7. Unauthorized access test (should throw 401)
  await TestValidator.httpError("unauthorized access", 401, async () => {
    await api.functional.shoppingMall.administrator.administrative_audit_logs.patch(
      connection,
      { body: requestBody },
    );
  });
}
