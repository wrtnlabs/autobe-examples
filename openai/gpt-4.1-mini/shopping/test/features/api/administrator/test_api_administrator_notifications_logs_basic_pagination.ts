import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallNotificationLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallNotificationLog";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import type { IShoppingMallNotificationLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallNotificationLog";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

export async function test_api_administrator_notifications_logs_basic_pagination(
  connection: api.IConnection,
): Promise<void> {
  // 1. Administrator registration and authorization
  const adminConnection: api.IConnection = { host: connection.host };
  const adminJoinBody: IShoppingMallAdministrator.IJoin = {};
  // Use utility function to join as administrator
  const auth: IShoppingMallAdministrator.IAuthorized =
    await authorize_administrator_join(adminConnection, {
      body: adminJoinBody,
    });
  // Update adminConnection headers with token for further requests
  adminConnection.headers = {
    ...(adminConnection.headers ?? {}),
    Authorization: `Bearer ${auth.token.access}`,
  };
  // 2. Retrieve paginated notification logs with empty filter (basic pagination)
  const output: IPageIShoppingMallNotificationLog.ISummary =
    await api.functional.shoppingMall.administrator.notifications.logs.index(
      adminConnection,
      {
        body: {}, // empty filter
      },
    );
  typia.assert(output);
  // 3. Validate pagination metadata
  TestValidator.predicate(
    "pagination current page >= 1",
    output.pagination.current >= 1,
  );
  TestValidator.predicate("pagination limit > 0", output.pagination.limit > 0);
  TestValidator.predicate(
    "pagination total records >= 0",
    output.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination total pages >= 0",
    output.pagination.pages >= 0,
  );
  TestValidator.predicate(
    "pagination pages consistent",
    output.pagination.pages ===
      Math.ceil(output.pagination.records / output.pagination.limit),
  );
  // 4. Validate each notification log in data
  for (const log of output.data) {
    typia.assert(log);
    // Cannot assert non-existent properties such as eventType, createdAt, updatedAt
    // Skip such property validation due to schema absence
  }
}
