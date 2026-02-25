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

export async function test_api_notification_template_create_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Administrator join and authorized connection
  const adminConnection: api.IConnection = { host: connection.host };
  const administrator = await authorize_administrator_join(adminConnection, {});
  adminConnection.headers = { Authorization: administrator.token.access };
  // 2. Prepare a unique notification template create payload
  const body: IShoppingMallNotificationTemplate.ICreate = {
    template_code: `${RandomGenerator.alphaNumeric(8)}_${Date.now()}`,
    template_name: RandomGenerator.name(2),
    content: RandomGenerator.paragraph({ sentences: 3 }),
    parameters: JSON.stringify({ userName: "string", orderId: "string" }),
  };
  // 3. Create the notification template
  const notificationTemplate =
    await generate_random_shopping_mall_administrator_notification_templates_create_notification_template(
      adminConnection,
      { body },
    );
  // 4. Validate the response type
  typia.assert(notificationTemplate);
  // 5. Validate that the response contains the created data matching the request
  TestValidator.equals(
    "template_code",
    notificationTemplate.templateCode,
    body.template_code,
  );
  TestValidator.equals(
    "template_name",
    notificationTemplate.templateName,
    body.template_name,
  );
  TestValidator.equals("content", notificationTemplate.content, body.content);
  TestValidator.equals(
    "parameters",
    notificationTemplate.parameters,
    body.parameters,
  );
  // 6. Validate timestamps are present and valid ISO strings
  TestValidator.predicate(
    "createdAt is ISO string",
    typeof notificationTemplate.createdAt === "string" &&
      Boolean(
        notificationTemplate.createdAt.match(
          /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.*Z$/,
        ),
      ),
  );
  TestValidator.predicate(
    "updatedAt is ISO string",
    typeof notificationTemplate.updatedAt === "string" &&
      Boolean(
        notificationTemplate.updatedAt.match(
          /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.*Z$/,
        ),
      ),
  );
  // 7. Ensure deletedAt is null
  TestValidator.equals(
    "deletedAt should be null",
    notificationTemplate.deletedAt,
    null,
  );
}
