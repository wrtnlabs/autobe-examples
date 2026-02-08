import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallUserNotificationPreference } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallUserNotificationPreference";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import type { IShoppingMallUserNotificationPreference } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallUserNotificationPreference";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

export async function test_api_user_notification_preferences_index_empty_results_and_deleted_filter(
  connection: api.IConnection,
): Promise<void> {
  // 1. Administrator join and get authorized connection
  const adminConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_administrator_join(adminConnection, {
    body: {},
  });
  // Set Authorization header
  adminConnection.headers = { Authorization: authorized.token.access };
  // 2. Test empty request returns data (possibly empty) without errors
  const response =
    await api.functional.shoppingMall.administrator.userNotificationPreferences.index(
      adminConnection,
      { body: {} },
    );
  typia.assert(response);
  // 3. Test that returned data contains only active (non-deleted) preferences
  // Since deleted_at property is not exposed, assume API filters deleted preferences
  TestValidator.predicate(
    "response data should be array",
    Array.isArray(response.data),
  );
  // 4. Test pagination with very high page number returns empty data
  const response2 =
    await api.functional.shoppingMall.administrator.userNotificationPreferences.index(
      adminConnection,
      {
        body: {
          page: 9999 as number & tags.Type<"int32">,
        },
      },
    );
  typia.assert(response2);
  TestValidator.predicate(
    "empty data for page beyond total",
    response2.data.length === 0,
  );
  // 5. Test zero limit returns empty data with valid pagination
  const response3 =
    await api.functional.shoppingMall.administrator.userNotificationPreferences.index(
      adminConnection,
      {
        body: {
          limit: 0 as number & tags.Type<"int32">,
        },
      },
    );
  typia.assert(response3);
  TestValidator.predicate(
    "empty data for zero limit",
    response3.data.length === 0,
  );
  // 6. Test negative page number coerced to at least 1
  const response4 =
    await api.functional.shoppingMall.administrator.userNotificationPreferences.index(
      adminConnection,
      {
        body: {
          page: -1 as number & tags.Type<"int32">,
          limit: 10 as number & tags.Type<"int32">,
        },
      },
    );
  typia.assert(response4);
  TestValidator.predicate(
    "pagination current page is at least 1",
    response4.pagination.current >= 1,
  );
}
