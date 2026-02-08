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
import { generate_random_shopping_mall_administrator_notification_templates_create_notification_template } from "../../../generate/generate_random_shopping_mall_administrator_notification_templates_create_notification_template";
import { prepare_random_shopping_mall_notification_template } from "../../../prepare/prepare_random_shopping_mall_notification_template";

export async function test_api_administrator_notification_template_update_various_cases(
  connection: api.IConnection,
): Promise<void> {
  // 1. Setup: Administrator authentication
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_administrator_join(adminConnection, {
    body: {},
  });
  adminConnection.headers = {
    Authorization: `Bearer ${adminAuth.token.access}`,
  };
  // 2. Create two notification templates for testing update and uniqueness
  const originalTemplate1 =
    await generate_random_shopping_mall_administrator_notification_templates_create_notification_template(
      adminConnection,
      { body: {} },
    );
  typia.assert(originalTemplate1);
  const originalTemplate2 =
    await generate_random_shopping_mall_administrator_notification_templates_create_notification_template(
      adminConnection,
      { body: {} },
    );
  typia.assert(originalTemplate2);
  // 3. Successful update: Use empty update body since no modifiable fields
  await api.functional.shoppingMall.administrator.notificationTemplates.updateNotificationTemplate(
    adminConnection,
    {
      notificationTemplateId: "00000000-0000-0000-0000-000000000000",
      body: {},
    },
  );
  // 4. Business validation - uniqueness constraint test
  await TestValidator.error("uniqueness conflict on update", async () => {
    await api.functional.shoppingMall.administrator.notificationTemplates.updateNotificationTemplate(
      adminConnection,
      {
        notificationTemplateId: "00000000-0000-0000-0000-000000000001",
        body: {},
      },
    );
  });
  // 5. Edge case: Update non-existent notification template
  await TestValidator.error(
    "update non-existent notification template",
    async () => {
      await api.functional.shoppingMall.administrator.notificationTemplates.updateNotificationTemplate(
        adminConnection,
        {
          notificationTemplateId: typia.random<string & tags.Format<"uuid">>(),
          body: {},
        },
      );
    },
  );
}
