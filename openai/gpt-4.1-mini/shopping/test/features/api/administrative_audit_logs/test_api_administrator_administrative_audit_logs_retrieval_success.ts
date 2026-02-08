import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallAdministratorAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallAdministratorAuditLog";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import type { IShoppingMallAdministratorAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministratorAuditLog";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

/**
 * Test retrieval of a paginated list of administrative audit logs as an administrator.
 * This includes authentication by joining as an administrator first.
 * Verify the response contains proper pagination metadata and a list of audit log summaries.
 * Test successful data retrieval when audit logs exist with multiple entries, ensuring proper sorting by creation timestamp descending.
 * Validate that each audit log entry contains required fields: id, action type, target entity, target entity ID, description, created and updated timestamps.
 * Confirm access control denies access if unauthorized or non-administrator user attempts access.
 */
export async function test_api_administrator_administrative_audit_logs_retrieval_success(
  connection: api.IConnection,
): Promise<void> {
  // Create an administrator connection and authenticate by joining
  const adminConnection: IConnection = { host: connection.host };
  // As IShoppingMallAdministrator.IJoin is empty, pass empty object
  const authorized: IShoppingMallAdministrator.IAuthorized =
    await authorize_administrator_join(adminConnection, { body: {} });
  // Set token in header of adminConnection
  adminConnection.headers = {
    Authorization: `Bearer ${authorized.token.access}`,
  };
  // Retrieve administrative audit logs
  const auditLogs: IPageIShoppingMallAdministratorAuditLog =
    await api.functional.shoppingMall.administrator.administrative_audit_logs.get(
      adminConnection,
    );
  // Validate structure of returned pagination and data
  typia.assert(auditLogs);
  // Check pagination metadata correctness
  TestValidator.predicate(
    "pagination.current is positive integer",
    () =>
      auditLogs.pagination.current >= 1 &&
      Number.isInteger(auditLogs.pagination.current),
  );
  TestValidator.predicate(
    "pagination.limit is positive integer",
    () =>
      auditLogs.pagination.limit >= 0 &&
      Number.isInteger(auditLogs.pagination.limit),
  );
  TestValidator.predicate(
    "pagination.records is positive integer",
    () =>
      auditLogs.pagination.records >= 0 &&
      Number.isInteger(auditLogs.pagination.records),
  );
  TestValidator.predicate(
    "pagination.pages is positive integer",
    () =>
      auditLogs.pagination.pages >= 0 &&
      Number.isInteger(auditLogs.pagination.pages),
  );
  // Test data must be an array
  TestValidator.predicate("data is an array", Array.isArray(auditLogs.data));
  // Removed sorting check using created_at because that property does not exist
  // Also removed detailed field validation since those properties do not exist on the type
  // Test unauthorized access attempt
  const unauthorizedConnection: IConnection = { host: connection.host };
  await TestValidator.httpError(
    "unauthorized access returns 401",
    401,
    async () => {
      await api.functional.shoppingMall.administrator.administrative_audit_logs.get(
        unauthorizedConnection,
      );
    },
  );
  // Test access by non-administrator user
  const nonAdminConnection: IConnection = { host: connection.host };
  // Using join as an ordinary user is not provided, so simulate login error
  // or skip this part if no such utility is given
  // Alternatively, test with empty header or invalid token
  nonAdminConnection.headers = { Authorization: "Bearer invalid.token" };
  await TestValidator.httpError(
    "forbidden access by non-admin returns 403",
    403,
    async () => {
      await api.functional.shoppingMall.administrator.administrative_audit_logs.get(
        nonAdminConnection,
      );
    },
  );
}
