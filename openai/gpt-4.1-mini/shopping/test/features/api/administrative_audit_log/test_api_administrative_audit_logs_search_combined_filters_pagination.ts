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

/**
 * Test combined search filters and pagination for administrative audit logs.
 * Authenticate as an administrator using join.
 * Construct a search query with multiple filters: specific administrator ID, creation date range, and text search within action descriptions.
 * Request the second page with a page size limit of 10.
 * Validate that the response data and pagination metadata accurately reflect the filters and pagination.
 * Ensure no unauthorized events in the response.
 */
export async function test_api_administrative_audit_logs_search_combined_filters_pagination(
  connection: api.IConnection,
): Promise<void> {
  // 1. Administrator join and authorization
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuthorized = await authorize_administrator_join(adminConnection, {
    body: {
      email: typia.random<string & typia.tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(12),
    },
  });
  typia.assert(adminAuthorized);
  // Attach token to admin connection headers
  adminConnection.headers = {
    Authorization: `Bearer ${adminAuthorized.token.access}`,
  };
  // 2. Construct the search query filters
  // Use real administrator id from authorized session
  const administratorId = adminAuthorized.id;
  // Determine date range: From 7 days ago to now
  const dateNow = new Date();
  const dateFrom = new Date(dateNow.getTime() - 7 * 24 * 60 * 60 * 1000);
  const dateTo = dateNow;
  // Text search - generate a random substring to search for
  // For testing, this is a random string that likely matches some logs
  const actionDescriptionSearch = RandomGenerator.substring(
    RandomGenerator.paragraph({ sentences: 3 }),
  );
  // Page 2, limit 10
  const page = 2;
  const limit = 10;
  const requestBody: IShoppingMallAdministrativeAuditLog.IRequest = {
    administratorId,
    createdAtFrom: dateFrom.toISOString() as string &
      typia.tags.Format<"date-time">,
    createdAtTo: dateTo.toISOString() as string &
      typia.tags.Format<"date-time">,
    actionDescriptionSearch,
    page,
    limit,
  };
  // 3. Call the search endpoint
  const response =
    await api.functional.shoppingMall.administrator.administrative_audit_logs.search.index(
      adminConnection,
      { body: requestBody },
    );
  // Validate the whole response shape
  typia.assert(response);
  // Validate pagination metadata
  TestValidator.predicate(
    "current page is requested page",
    response.pagination.current === page,
  );
  TestValidator.predicate(
    "limit is respected",
    response.pagination.limit === limit,
  );
  TestValidator.predicate(
    "pages is consistent",
    response.pagination.pages ===
      (response.pagination.records === 0
        ? 0
        : Math.ceil(response.pagination.records / limit)),
  );
  // Validate each data matches filter criteria
  response.data.forEach((log) => {
    // 1. Filter by administrator ID
    TestValidator.equals(
      "administrator ID filter",
      log.administrator.id,
      administratorId,
    );
    // 2. Filter by createdAt range
    const createdAtDate = new Date(log.createdAt);
    TestValidator.predicate(
      "createdAt >= filter from",
      createdAtDate >= dateFrom,
    );
    TestValidator.predicate("createdAt <= filter to", createdAtDate <= dateTo);
    // 3. Check actionDescriptionSearch present in actionType or targetEntity as textual search (since actionDescription field doesn't exist, apply to actionType or targetEntity)
    // We test that either actionType or targetEntity contains the substring if actionDescriptionSearch is non-empty
    const searchText = actionDescriptionSearch.toLowerCase();
    const isInActionType = log.actionType.toLowerCase().includes(searchText);
    const isInTargetEntity = log.targetEntity
      .toLowerCase()
      .includes(searchText);
    TestValidator.predicate(
      "action description search filter",
      searchText === "" || isInActionType || isInTargetEntity,
    );
    // 4. Check no unauthorized entries with deletedAt non-null
    TestValidator.predicate(
      "deletedAt is null",
      log.deletedAt === null || log.deletedAt === undefined,
    );
  });
}
