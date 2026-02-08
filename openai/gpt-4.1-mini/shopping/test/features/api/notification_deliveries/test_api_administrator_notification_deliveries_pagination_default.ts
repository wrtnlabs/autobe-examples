import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallNotificationDelivery } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallNotificationDelivery";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import type { IShoppingMallNotificationDelivery } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallNotificationDelivery";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

export async function test_api_administrator_notification_deliveries_pagination_default(
  connection: api.IConnection,
): Promise<void> {
  // 1. Administrator join and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  const adminJoin = await authorize_administrator_join(adminConnection, {
    body: {},
  });
  adminConnection.headers = {
    Authorization: `Bearer ${adminJoin.token.access}`,
  };
  // 2. Call the notification deliveries index API with empty request body to fetch default paginated list
  const response =
    await api.functional.shoppingMall.administrator.notificationDeliveries.index(
      adminConnection,
      { body: {} },
    );
  // 3. Validate response type and contents
  typia.assert(response);
  // 4. Validate pagination metadata presence and reasonable values
  TestValidator.predicate(
    "pagination object exists",
    response.pagination !== null && typeof response.pagination === "object",
  );
  TestValidator.predicate(
    "current page number is positive",
    response.pagination.current >= 1,
  );
  TestValidator.predicate("limit is positive", response.pagination.limit > 0);
  // 5. Validate sort order of data by attemptedAt descending
  const data = response.data;
  // Sorting validation removed due to missing property on ISummary type
}
