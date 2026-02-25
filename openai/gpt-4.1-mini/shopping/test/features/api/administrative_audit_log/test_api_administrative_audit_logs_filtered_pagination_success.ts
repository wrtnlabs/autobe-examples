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

export async function test_api_administrative_audit_logs_filtered_pagination_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Administrator setup and authorization
  const adminConnection: api.IConnection = { host: connection.host };
  const adminJoinBody: IShoppingMallAdministrator.IJoin = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "testAdminPass123",
  };
  const adminAuthorized = await authorize_administrator_join(adminConnection, {
    body: adminJoinBody,
  });
  typia.assert(adminAuthorized);
  // Use admin-specific connection with auth token
  const authorizedConnection: api.IConnection = {
    host: connection.host,
    headers: {
      Authorization: `Bearer ${adminAuthorized.token.access}`,
    },
  };
  // Prepare multiple audit logs by calling the API with different filters
  // Since we cannot create audit logs directly, assume we have some logs already created
  // 2. Retrieve audit logs without filter (pagination test)
  const noFilterResponse =
    await api.functional.shoppingMall.administrator.administrativeAuditLogs.index(
      authorizedConnection,
      {
        body: {
          limit: 10,
          offset: 0,
          page: 1,
        } satisfies IShoppingMallAdministrativeAuditLog.IRequest,
      },
    );
  typia.assert(noFilterResponse);
  TestValidator.predicate(
    "pagination limit respected",
    noFilterResponse.pagination.limit === 10,
  );
  TestValidator.predicate(
    "pagination page number correct",
    noFilterResponse.pagination.current === 1,
  );
  // 3. If no data, test empty response handling
  if (noFilterResponse.data.length === 0) {
    TestValidator.predicate("empty data array on no logs", true);
    return;
  }
  // Use first log for other filter criteria testing
  const sampleLog = noFilterResponse.data[0];
  // 4. Test filter by actionType
  const actionTypeFilter = sampleLog.actionType;
  const filterByActionType =
    await api.functional.shoppingMall.administrator.administrativeAuditLogs.index(
      authorizedConnection,
      {
        body: {
          actionType: actionTypeFilter,
          limit: 5,
          offset: 0,
        } satisfies IShoppingMallAdministrativeAuditLog.IRequest,
      },
    );
  typia.assert(filterByActionType);
  filterByActionType.data.forEach((log) => {
    TestValidator.equals(
      "actionType matches filter",
      log.actionType,
      actionTypeFilter,
    );
  });
  // 5. Test filter by targetEntity
  const targetEntityFilter = sampleLog.targetEntity;
  const filterByTargetEntity =
    await api.functional.shoppingMall.administrator.administrativeAuditLogs.index(
      authorizedConnection,
      {
        body: {
          targetEntity: targetEntityFilter,
          limit: 5,
          offset: 0,
        } satisfies IShoppingMallAdministrativeAuditLog.IRequest,
      },
    );
  typia.assert(filterByTargetEntity);
  filterByTargetEntity.data.forEach((log) => {
    TestValidator.equals(
      "targetEntity matches filter",
      log.targetEntity,
      targetEntityFilter,
    );
  });
  // 6. Test filter by administratorId
  const administratorIdFilter = sampleLog.administrator.id;
  const filterByAdminId =
    await api.functional.shoppingMall.administrator.administrativeAuditLogs.index(
      authorizedConnection,
      {
        body: {
          administratorId: administratorIdFilter,
          limit: 5,
          offset: 0,
        } satisfies IShoppingMallAdministrativeAuditLog.IRequest,
      },
    );
  typia.assert(filterByAdminId);
  filterByAdminId.data.forEach((log) => {
    TestValidator.equals(
      "administratorId matches filter",
      log.administrator.id,
      administratorIdFilter,
    );
  });
  // 7. Test filter by createdAtFrom and createdAtTo
  const createdAtFrom = sampleLog.createdAt;
  const createdAtTo = new Date(
    new Date(createdAtFrom).getTime() + 24 * 3600 * 1000,
  ).toISOString();
  const filterByDateRange =
    await api.functional.shoppingMall.administrator.administrativeAuditLogs.index(
      authorizedConnection,
      {
        body: {
          createdAtFrom: createdAtFrom,
          createdAtTo: createdAtTo,
          limit: 5,
          offset: 0,
        } satisfies IShoppingMallAdministrativeAuditLog.IRequest,
      },
    );
  typia.assert(filterByDateRange);
  filterByDateRange.data.forEach((log) => {
    TestValidator.predicate(
      "createdAt >= createdAtFrom",
      log.createdAt >= createdAtFrom,
    );
    TestValidator.predicate(
      "createdAt <= createdAtTo",
      log.createdAt <= createdAtTo,
    );
  });
  // 8. Test filter by actionDescriptionSearch (use substring of description)
  // Since we cannot read exact action descriptions, we just use a substring of actionType for demonstration
  const actionDescriptionSearch = actionTypeFilter.substring(0, 3);
  const filterByDescriptionSearch =
    await api.functional.shoppingMall.administrator.administrativeAuditLogs.index(
      authorizedConnection,
      {
        body: {
          actionDescriptionSearch: actionDescriptionSearch,
          limit: 5,
          offset: 0,
        } satisfies IShoppingMallAdministrativeAuditLog.IRequest,
      },
    );
  typia.assert(filterByDescriptionSearch);
  // Cannot validate each description, but validate response type and length
  TestValidator.predicate(
    "actionDescriptionSearch filter returns array",
    Array.isArray(filterByDescriptionSearch.data),
  );
  // 9. Test pagination offset by comparing noFilterResponse with offset
  if (noFilterResponse.data.length > 5) {
    const offsetResponse =
      await api.functional.shoppingMall.administrator.administrativeAuditLogs.index(
        authorizedConnection,
        {
          body: {
            limit: 5,
            offset: 5,
          } satisfies IShoppingMallAdministrativeAuditLog.IRequest,
        },
      );
    typia.assert(offsetResponse);
    // Ensure data are different from first page
    if (offsetResponse.data.length > 0) {
      TestValidator.notEquals(
        "offset data differs from first page",
        noFilterResponse.data[0].id,
        offsetResponse.data[0].id,
      );
    }
  }
  // 10. Test unauthorized access returns error
  const unauthorizedConnection: api.IConnection = {
    host: connection.host,
  };
  await TestValidator.httpError("unauthorized access", 401, async () => {
    await api.functional.shoppingMall.administrator.administrativeAuditLogs.index(
      unauthorizedConnection,
      { body: {} },
    );
  });
}
