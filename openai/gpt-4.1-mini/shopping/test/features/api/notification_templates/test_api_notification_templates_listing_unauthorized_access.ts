import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallNotificationTemplate } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallNotificationTemplate";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import type { IShoppingMallNotificationTemplate } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallNotificationTemplate";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

export async function test_api_notification_templates_listing_unauthorized_access(
  connection: api.IConnection,
): Promise<void> {
  // Create a connection without authorization headers to simulate unauthorized access
  const unauthorizedConnection: api.IConnection = { host: connection.host };
  // Prepare an empty request body since the request DTO has no required properties
  const body: IShoppingMallNotificationTemplate.IRequest = {};
  // Attempt accessing the notification templates listing endpoint without authentication
  await TestValidator.httpError(
    "unauthorized access should be rejected with 401 or 403",
    [401, 403],
    async () => {
      await api.functional.shoppingMall.administrator.notificationTemplates.index(
        unauthorizedConnection,
        { body },
      );
    },
  );
}
