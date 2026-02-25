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
import { generate_random_shopping_mall_administrator_notification_templates_create_notification_template } from "../../../generate/generate_random_shopping_mall_administrator_notification_templates_create_notification_template";
import { prepare_random_shopping_mall_notification_template } from "../../../prepare/prepare_random_shopping_mall_notification_template";

export async function test_api_notification_template_retrieve_existing_valid_id_authorized(
  connection: api.IConnection,
): Promise<void> {
  // 1. Administrator setup - join and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuthorized = await authorize_administrator_join(
    adminConnection,
    {},
  );
  // adminConnection.headers.Authorization updated by authorize function
  // 2. Create a notification template
  const createdTemplate =
    await generate_random_shopping_mall_administrator_notification_templates_create_notification_template(
      adminConnection,
      {},
    );
  typia.assert(createdTemplate);
  // 3. Retrieve the notification template by valid ID
  const fetchedTemplate =
    await api.functional.shoppingMall.administrator.notificationTemplates.at(
      adminConnection,
      { templateId: createdTemplate.id },
    );
  typia.assert(fetchedTemplate);
  // 4. Validate all fields exact match
  TestValidator.equals(
    "notification template id",
    fetchedTemplate.id,
    createdTemplate.id,
  );
  TestValidator.equals(
    "notification template code",
    fetchedTemplate.templateCode,
    createdTemplate.templateCode,
  );
  TestValidator.equals(
    "notification template name",
    fetchedTemplate.templateName,
    createdTemplate.templateName,
  );
  TestValidator.equals(
    "notification template content",
    fetchedTemplate.content,
    createdTemplate.content,
  );
  TestValidator.equals(
    "notification template parameters",
    fetchedTemplate.parameters,
    createdTemplate.parameters,
  );
  TestValidator.equals(
    "notification template createdAt",
    fetchedTemplate.createdAt,
    createdTemplate.createdAt,
  );
  TestValidator.equals(
    "notification template updatedAt",
    fetchedTemplate.updatedAt,
    createdTemplate.updatedAt,
  );
  // deletedAt can be null
  TestValidator.equals(
    "notification template deletedAt",
    fetchedTemplate.deletedAt ?? null,
    createdTemplate.deletedAt ?? null,
  );
}
