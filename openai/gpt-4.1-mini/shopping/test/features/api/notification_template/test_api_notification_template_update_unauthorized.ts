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

export async function test_api_notification_template_update_unauthorized(
  connection: api.IConnection,
): Promise<void> {
  // Use base connection without administrator login
  // Prepare a random update payload for notification template
  const body = typia.random<IShoppingMallNotificationTemplate.IUpdate>();
  // Generate a random UUID for templateId
  const templateId = typia.random<string & tags.Format<"uuid">>();
  // Attempt to update the notification template without admin authorization
  await TestValidator.httpError(
    "403 Forbidden for unauthorized notification template update",
    403,
    async () => {
      await api.functional.shoppingMall.administrator.notificationTemplates.update(
        connection,
        {
          templateId,
          body,
        },
      );
    },
  );
}
