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

export async function test_api_administrator_snapshot_report_with_valid_filters_and_pagination(
  connection: api.IConnection,
): Promise<void> {
  // This test retrieves a snapshot report as an authenticated administrator
  // and validates pagination and access control. No detailed snapshot properties
  // are validated because the DTO does not define any.
  // 1. Administrator registration and authentication
  const adminConnection: api.IConnection = { host: connection.host };
  const adminJoinBody: IShoppingMallAdministrator.IJoin = {};
  const authorizedAdmin: IShoppingMallAdministrator.IAuthorized =
    await authorize_administrator_join(adminConnection, {
      body: adminJoinBody,
    });
  adminConnection.headers = {
    Authorization: `Bearer ${authorizedAdmin.token.access}`,
  };
  // 2. Prepare request body (empty as per schema)
  const requestBody: IShoppingMallSnapshotReport.IRequest = {};
  // 3. Call the snapshot report endpoint
  const response: IPageIShoppingMallSnapshotReport.ISummary =
    await api.functional.shoppingMall.administrator.snapshots.report.index(
      adminConnection,
      { body: requestBody },
    );
  // Validate entire response
  typia.assert(response);
  // 4. Validate pagination properties
  TestValidator.predicate(
    "pagination current page >= 0",
    response.pagination.current >= 0,
  );
  TestValidator.predicate(
    "pagination limit >= 0",
    response.pagination.limit >= 0,
  );
  TestValidator.predicate(
    "pagination pages >= 0",
    response.pagination.pages >= 0,
  );
  TestValidator.predicate(
    "pagination records >= 0",
    response.pagination.records >= 0,
  );
  // 5. Validate data is array
  TestValidator.predicate(
    "response data is an array",
    Array.isArray(response.data),
  );
  // 6. Unauthorized access should be forbidden
  const unauthConnection: api.IConnection = { host: connection.host };
  await TestValidator.error("unauthorized snapshot report access", async () => {
    await api.functional.shoppingMall.administrator.snapshots.report.index(
      unauthConnection,
      { body: requestBody },
    );
  });
}
