import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallUserNotification } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallUserNotification";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import type { IShoppingMallUserNotification } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallUserNotification";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

export async function test_api_administrator_user_notifications_filter_by_type_with_pagination(
  connection: api.IConnection,
): Promise<void> {
  // Test querying user notifications filtered by notification type with pagination parameters.
  // Authenticate as an administrator, request notifications, specify empty filter object (since schema has no properties).
  // Verify response has pagination and data array, validate authorization via successful call.
  const adminConnection: api.IConnection = { host: connection.host };
  const authorizedAdmin = await authorize_administrator_join(adminConnection, {
    body: {},
  });
  typia.assert(authorizedAdmin);
  // Call userNotifications index endpoint with empty filter request body
  const response =
    await api.functional.shoppingMall.administrator.userNotifications.index(
      adminConnection,
      {
        body: {},
      },
    );
  typia.assert(response);
  // Validate pagination object exists and has positive values
  TestValidator.predicate(
    "pagination object is present",
    response.pagination !== null && response.pagination !== undefined,
  );
  TestValidator.predicate(
    "pagination limit non-negative",
    response.pagination.limit >= 0,
  );
  TestValidator.predicate(
    "pagination current page non-negative",
    response.pagination.current >= 0,
  );
  TestValidator.predicate(
    "pagination pages non-negative",
    response.pagination.pages >= 0,
  );
  TestValidator.predicate(
    "pagination records count non-negative",
    response.pagination.records >= 0,
  );
  // Validate data is array
  TestValidator.predicate("data is array", Array.isArray(response.data));
}
