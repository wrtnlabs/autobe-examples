import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
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

export async function test_api_administrator_notification_template_retrieval_not_found(
  connection: api.IConnection,
): Promise<void> {
  // This test covers the scenario where the notification template ID does not exist in the system.
  // It verifies that the system responds with a 404 error code and appropriate error message.
  // Authorization as administrator is required prior to this operation.
  // 1. Administrator join to get authorized connection
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_administrator_join(adminConnection, {
    body: {},
  });
  // 2. Attempt to get a non-existent notification template
  const fakeId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.httpError(
    "notification template retrieval with non-existent ID should fail with 404",
    404,
    async () => {
      await api.functional.shoppingMall.administrator.notificationTemplates.at(
        adminConnection,
        { notificationTemplateId: fakeId },
      );
    },
  );
}
