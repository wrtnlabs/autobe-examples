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

export async function test_api_administrator_notification_template_creation(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin authentication
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_administrator_join(adminConnection, {
    body: typia.random<IShoppingMallAdministrator.IJoin>(),
  });
  adminConnection.headers ??= {};
  adminConnection.headers.Authorization = `Bearer ${adminAuth.token.access}`;
  // 2. Try to create a notification template with empty create body as DTO is empty
  const createBodyEmpty: IShoppingMallNotificationTemplate.ICreate = {};
  const createdTemplate1 =
    await generate_random_shopping_mall_administrator_notification_templates_create_notification_template(
      adminConnection,
      {
        body: createBodyEmpty,
      },
    );
  typia.assert(createdTemplate1);
  // 3. Try to create another notification template with the same empty create body
  // Since the create body is empty, duplication errors are not testable reliably
  // But still test if error occurs
  await TestValidator.error(
    "duplicate template creation should fail or not",
    async () => {
      await generate_random_shopping_mall_administrator_notification_templates_create_notification_template(
        adminConnection,
        {
          body: createBodyEmpty,
        },
      );
    },
  );
  // 4. Minimal creation with empty body again
  const createdTemplateMinimal =
    await generate_random_shopping_mall_administrator_notification_templates_create_notification_template(
      adminConnection,
      {
        body: createBodyEmpty,
      },
    );
  typia.assert(createdTemplateMinimal);
}
