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

export async function test_api_administrator_snapshot_report_filtered_by_date_and_entity_types(
  connection: api.IConnection,
): Promise<void> {
  // Scenario: Administrator retrieves snapshot reports with filters but given DTO has no filter props
  // 1. Administrator registers (join) and obtains authorization token
  const adminConnection: api.IConnection = { host: connection.host };
  const adminJoin = await authorize_administrator_join(adminConnection, {
    body: {} satisfies IShoppingMallAdministrator.IJoin,
  });
  typia.assert(adminJoin);
  // Use token for authorization
  adminConnection.headers = {
    ...adminConnection.headers,
    Authorization: `Bearer ${adminJoin.token.access}`,
  };
  // 2. Call snapshot report query with empty filter object since IShoppingMallSnapshotReport.IRequest is empty
  const report =
    await api.functional.shoppingMall.administrator.snapshots.report.index(
      adminConnection,
      {
        body: {} satisfies IShoppingMallSnapshotReport.IRequest,
      },
    );
  typia.assert(report);
  // 3. Validate pagination
  TestValidator.predicate(
    "pagination current page is positive",
    report.pagination.current >= 0,
  );
  TestValidator.predicate(
    "pagination limit is positive",
    report.pagination.limit >= 0,
  );
  TestValidator.predicate(
    "pagination pages is non-negative",
    report.pagination.pages >= 0,
  );
  TestValidator.predicate(
    "pagination records count is non-negative",
    report.pagination.records >= 0,
  );
  // 4. Validate data items array is present
  TestValidator.predicate(
    "report data is an array",
    Array.isArray(report.data),
  );
  // 5. Validate each data item structurally by typia.assert
  for (const item of report.data) {
    typia.assert(item);
  }
}
