import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallAdministratorAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallAdministratorAuditLog";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import type { IShoppingMallAdministratorAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministratorAuditLog";
import type { IShoppingMallAdministratorGrade } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministratorGrade";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

export async function test_api_administrator_audit_logs_retrieval_date_range_keyword_filter(
  connection: api.IConnection,
): Promise<void> {
  // Administrator joins the system to obtain authorization
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuthorized = await authorize_administrator_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "VeryStrongPassword1",
    },
  });
  typia.assert(adminAuthorized);
  adminConnection.headers = {
    Authorization: `Bearer ${adminAuthorized.token.access}`,
  };
  // Prepare filter parameters for date range and keyword
  // Use a date range covering recent days and a keyword substring from typia.random string
  const now = new Date();
  const fromDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000); // 7 days ago
  const toDate = now;
  const keyword = "audit"; // fixed keyword to be searched in description
  // Prepare audit log index request body
  const requestBody: IShoppingMallAdministratorAuditLog.IRequest = {
    createdFrom: fromDate.toISOString(),
    createdTo: toDate.toISOString(),
    keyword,
    page: 1,
    limit: 20,
  };
  // Call the audit log index endpoint with filtering parameters
  const auditLogPage =
    await api.functional.shoppingMall.administrator.auditLogs.index(
      adminConnection,
      { body: requestBody },
    );
  typia.assert(auditLogPage);
  // Assert pagination fields
  TestValidator.predicate(
    "pagination current page positive",
    auditLogPage.pagination.current >= 1,
  );
  TestValidator.predicate(
    "pagination limit positive",
    auditLogPage.pagination.limit > 0,
  );
  TestValidator.predicate(
    "pagination records non-negative",
    auditLogPage.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages non-negative",
    auditLogPage.pagination.pages >= 0,
  );
  // Validate that all audit log entries contain necessary fields
  auditLogPage.data.forEach((entry, index) => {
    typia.assert(entry);
    TestValidator.predicate(
      `audit log entry[${index}] has valid id`,
      typeof entry.id === "string" && entry.id.length > 0,
    );
    TestValidator.predicate(
      `audit log entry[${index}] timestamp after fromDate`,
      new Date(entry.createdAt) >= fromDate,
    );
    TestValidator.predicate(
      `audit log entry[${index}] timestamp before toDate`,
      new Date(entry.createdAt) <= toDate,
    );
    TestValidator.predicate(
      `audit log entry[${index}] matches keyword in description`,
      entry.description.toLowerCase().includes(keyword.toLowerCase()),
    );
    // Validate administrator summary within each log entry
    const admin = entry.administrator;
    typia.assert(admin);
    TestValidator.predicate(
      `audit log entry[${index}] administrator id valid`,
      typeof admin.id === "string" && admin.id.length > 0,
    );
    TestValidator.predicate(
      `audit log entry[${index}] administrator email valid`,
      typeof admin.email === "string" && admin.email.includes("@"),
    );
    TestValidator.predicate(
      `audit log entry[${index}] administrator name valid`,
      typeof admin.name === "string" && admin.name.length > 0,
    );
    TestValidator.predicate(
      `audit log entry[${index}] administrator grade name valid`,
      typeof admin.administratorGrade.name === "string" &&
        admin.administratorGrade.name.length > 0,
    );
    TestValidator.predicate(
      `audit log entry[${index}] administrator grade id valid`,
      typeof admin.administratorGrade.id === "string" &&
        admin.administratorGrade.id.length > 0,
    );
    TestValidator.predicate(
      `audit log entry[${index}] administrator isSuperAdmin boolean`,
      typeof admin.isSuperAdmin === "boolean",
    );
  });
  // Use TestValidator.index to confirm index correctness of IDs
  const expectedIds = auditLogPage.data;
  const gottenIds = auditLogPage.data;
  TestValidator.index("audit log IDs index check", expectedIds, gottenIds);
}
