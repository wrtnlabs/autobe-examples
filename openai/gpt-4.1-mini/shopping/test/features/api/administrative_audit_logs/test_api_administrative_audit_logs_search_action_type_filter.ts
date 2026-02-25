import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallAdministrativeAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallAdministrativeAuditLog";
import type { IShoppingMallAdministrativeAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrativeAuditLog";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import type { IShoppingMallAdministratorGrade } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministratorGrade";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

export async function test_api_administrative_audit_logs_search_action_type_filter(
  connection: api.IConnection,
): Promise<void> {
  // Test retrieving administrative audit logs with a filter by action type only.
  // Authenticate as a new administrator via join endpoint.
  // Send a search request filtering audit logs by a known action type (e.g., 'create').
  // Verify that the response contains audit log entries only of the specified action type.
  // Confirm pagination metadata is correctly returned, including total records and page numbers.
  // This scenario covers basic filtering by action type and successful pagination response validation.
  // 1. Administrator join and authentication
  const adminConnection: api.IConnection = { host: connection.host };
  const authorizedAdmin = await authorize_administrator_join(adminConnection, {
    body: {
      email: typia.random<string & typia.tags.Format<"email">>(),
      password: "StrongP@ssword123",
    },
  });
  typia.assert(authorizedAdmin);
  // Use token to authorize further requests
  adminConnection.headers = {
    Authorization: `Bearer ${authorizedAdmin.token.access}`,
  };
  // 2. Define known actionType filter for audit log search - use "create" as example
  const actionTypeFilter = "create";
  // 3. Request administrative audit logs filtered by action type
  const searchRequestBody: {
    actionType: string;
    page: number;
    limit: number;
  } = {
    actionType: actionTypeFilter,
    page: 1,
    limit: 10,
  };
  const auditLogPage =
    await api.functional.shoppingMall.administrator.administrative_audit_logs.search.index(
      adminConnection,
      {
        body: searchRequestBody,
      },
    );
  typia.assert(auditLogPage);
  // 4. Verify all audit log entries have matching actionType
  for (const auditLog of auditLogPage.data) {
    TestValidator.equals(
      "audit log actionType filter",
      auditLog.actionType,
      actionTypeFilter,
    );
  }
  // 5. Confirm pagination metadata correctness
  const pagination = auditLogPage.pagination;
  TestValidator.predicate(
    "pagination current page number",
    pagination.current === 1,
  );
  TestValidator.predicate("pagination limit is positive", pagination.limit > 0);
  TestValidator.predicate(
    "pagination records count non-negative",
    pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages count non-negative",
    pagination.pages >= 0,
  );
}
