import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import type { IShoppingMallAdministratorGrade } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministratorGrade";
import type { IShoppingMallUserNotificationUnreadCount } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallUserNotificationUnreadCount";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

export async function test_api_administrator_notifications_unread_count_unauthorized(
  connection: api.IConnection,
): Promise<void> {
  // This test attempts to access the unread notifications count endpoint without
  // authentication and expects a 401 Unauthorized HTTP error to ensure that
  // authentication enforcement is properly handled.
  const baseConnection: api.IConnection = { host: connection.host };
  // Attempt unauthorized request without any auth headers
  await TestValidator.httpError(
    "unauthorized access returns 401",
    401,
    async () => {
      await api.functional.shoppingMall.administrator.notifications.unread_count.unreadCount(
        baseConnection,
      );
    },
  );
}
