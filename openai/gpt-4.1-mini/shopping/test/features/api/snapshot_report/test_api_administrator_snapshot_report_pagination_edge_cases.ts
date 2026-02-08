import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallSnapshotReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallSnapshotReport";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import type { IShoppingMallSnapshotReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSnapshotReport";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

export async function test_api_administrator_snapshot_report_pagination_edge_cases(
  connection: api.IConnection,
): Promise<void> {
  // Test pagination edge cases for snapshot report retrieval by an administrator,
  // including querying with a page number beyond available pages resulting in empty results
  // and querying with maximum allowed page size. Validate correctness and completeness
  // of pagination metadata and data array.
  // 1. Administrator registration for authentication
  const adminConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_administrator_join(adminConnection, {
    body: {},
  });
  adminConnection.headers = { Authorization: authorized.token.access };
  // 2. Query first page without filters or pagination (empty body)
  const firstPageResult =
    await api.functional.shoppingMall.administrator.snapshots.report.index(
      adminConnection,
      { body: {} },
    );
  typia.assert(firstPageResult);
  // Basic assertions on pagination metadata
  TestValidator.predicate(
    "first page has current page >= 1",
    firstPageResult.pagination.current >= 1,
  );
  TestValidator.predicate(
    "limit is positive",
    firstPageResult.pagination.limit > 0,
  );
  TestValidator.predicate(
    "records is non-negative",
    firstPageResult.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pages is non-negative",
    firstPageResult.pagination.pages >= 0,
  );
  TestValidator.predicate(
    "pages calculation correct",
    (firstPageResult.pagination.records === 0 &&
      firstPageResult.pagination.pages === 0) ||
      (firstPageResult.pagination.records > 0 &&
        firstPageResult.pagination.pages > 0),
  );
  // 3. Query page beyond total pages (e.g., pages + 1) should be empty if pages > 0
  // However, the request body doesn't support page number input, so actual API call skipped
  // 4. Skip checking data ordering by snapshot creation date since property 'created_at' does not exist in ISummary
}
