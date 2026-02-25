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

export async function test_api_notification_template_retrieve_nonexistent_id_not_found(
  connection: api.IConnection,
): Promise<void> {
  // Scenario: Retrieve a notification template by a non-existent UUID templateId as an authorized administrator
  // 1. Administrator joins and obtains authorized connection
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuthorized = await authorize_administrator_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "12345678",
    },
  });
  // Update the adminConnection headers with the obtained token
  adminConnection.headers = {
    Authorization: `Bearer ${adminAuthorized.token.access}`,
  };
  // 2. Generate a random UUID that does not exist (simulate non-existent templateId)
  const nonExistentTemplateId = typia.random<string & tags.Format<"uuid">>();
  // 3. Attempt to retrieve the notification template with the non-existent ID and expect 404 error
  await TestValidator.httpError(
    "retrieve notification template with non-existent ID returns 404",
    404,
    async () => {
      await api.functional.shoppingMall.administrator.notificationTemplates.at(
        adminConnection,
        { templateId: nonExistentTemplateId },
      );
    },
  );
}
