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
 * Test pagination and sorting functionality of administrator audit logs search endpoint.
 *
 * It authenticates as an administrator, performs paginated search requests,
 * validates pagination metadata, and verifies total page and record consistency.
 * Due to absence of 'create_at' property in DTO, ordering validations by timestamp
 * are omitted while preserving pagination validation.
 */
export async function test_api_administrator_audit_logs_search_pagination_sorting(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as administrator
  const adminConnection: IConnection = { host: connection.host };
  const adminAuthorized = await authorize_administrator_join(adminConnection, {
    body: {},
  });
  adminConnection.headers = {
    Authorization: `Bearer ${adminAuthorized.token.access}`,
  };
  // Helper for performing search with pagination and sorting
  async function searchAuditLogs(
    page: number,
    limit: number,
    sortAsc: boolean,
  ): Promise<
    import("@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallAdministratorAuditLog").IPageIShoppingMallAdministratorAuditLog.ISummary
  > {
    const body = {
      pagination: {
        current: page,
        limit: limit,
      },
      sort: {
        create_at: sortAsc ? "asc" : "desc",
      },
    } as any;
    const response =
      await api.functional.shoppingMall.administrator.audit_logs.search.index(
        adminConnection,
        { body },
      );
    typia.assert(response);
    return response;
  }
  const pageSize = 5;
  // First page descending
  const firstPageDesc = await searchAuditLogs(1, pageSize, false);
  TestValidator.predicate("firstPage has data", firstPageDesc.data.length > 0);
  TestValidator.equals(
    "first page current",
    firstPageDesc.pagination.current,
    1,
  );
  TestValidator.predicate(
    "total pages positive",
    firstPageDesc.pagination.pages > 0,
  );
  TestValidator.equals(
    "limit matches",
    firstPageDesc.pagination.limit,
    pageSize,
  );
  TestValidator.predicate(
    "records at least data length",
    firstPageDesc.pagination.records >= firstPageDesc.data.length,
  );
  // Second page descending
  const secondPageDesc = await searchAuditLogs(2, pageSize, false);
  TestValidator.equals(
    "second page current",
    secondPageDesc.pagination.current,
    2,
  );
  TestValidator.equals(
    "limit matches",
    secondPageDesc.pagination.limit,
    pageSize,
  );
  TestValidator.equals(
    "total records consistent",
    secondPageDesc.pagination.records,
    firstPageDesc.pagination.records,
  );
  TestValidator.equals(
    "total pages consistent",
    secondPageDesc.pagination.pages,
    firstPageDesc.pagination.pages,
  );
  // First page ascending
  const firstPageAsc = await searchAuditLogs(1, pageSize, true);
  TestValidator.equals(
    "first page current asc",
    firstPageAsc.pagination.current,
    1,
  );
  TestValidator.equals(
    "limit matches asc",
    firstPageAsc.pagination.limit,
    pageSize,
  );
  TestValidator.equals(
    "total records consistent asc",
    firstPageAsc.pagination.records,
    firstPageDesc.pagination.records,
  );
  TestValidator.equals(
    "total pages consistent asc",
    firstPageAsc.pagination.pages,
    firstPageDesc.pagination.pages,
  );
  // Check middle page if exists
  const midPage = Math.floor(firstPageAsc.pagination.pages / 2);
  if (midPage > 1) {
    const midPageResult = await searchAuditLogs(midPage, pageSize, true);
    TestValidator.equals(
      "mid page current",
      midPageResult.pagination.current,
      midPage,
    );
    TestValidator.predicate("mid page has data", midPageResult.data.length > 0);
  }
}
