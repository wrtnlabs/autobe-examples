import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import type { IShoppingMallAdministratorGrade } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministratorGrade";
import type { IShoppingMallNotificationTemplate } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallNotificationTemplate";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

export async function test_api_notification_template_retrieve_unauthorized_access(
  connection: api.IConnection,
): Promise<void> {
  // Description:
  // Test unauthorized access attempt to retrieve a notification template.
  // Perform the GET request without authentication or with invalid credentials.
  // Expect HTTP 401 or 403 error indicating access denied.
  // Confirm that the security authorization guard prevents access and no data is returned in unauthorized cases.
  // 1. Setup: Administrator join to create valid administrator user for baseline
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_administrator_join(adminConnection, {
    body: {
      email: typia.random<string & typia.tags.Format<"email">>(),
      password: "validpassword",
    },
  });
  // 2. Attempt to retrieve notification template WITHOUT any authorization
  await TestValidator.httpError(
    "unauthenticated access should be denied",
    [401, 403],
    async () => {
      await api.functional.shoppingMall.administrator.notificationTemplates.at(
        { host: connection.host },
        {
          templateId: typia.random<string & typia.tags.Format<"uuid">>(),
        },
      );
    },
  );
  // 3. Attempt to retrieve notification template WITH invalid (random) authorization headers
  const invalidAuthConnection: api.IConnection = {
    host: connection.host,
    headers: { Authorization: "Bearer invalid.token.value" },
  };
  await TestValidator.httpError(
    "invalid authorization token should be denied",
    [401, 403],
    async () => {
      await api.functional.shoppingMall.administrator.notificationTemplates.at(
        invalidAuthConnection,
        {
          templateId: typia.random<string & typia.tags.Format<"uuid">>(),
        },
      );
    },
  );
}
