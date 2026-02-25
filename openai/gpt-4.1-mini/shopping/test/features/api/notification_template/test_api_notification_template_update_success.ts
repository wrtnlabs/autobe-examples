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

export async function test_api_notification_template_update_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Administrator sign up (join) as prerequisite
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuthorized = await authorize_administrator_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "strongpassword",
    },
  });
  typia.assert(adminAuthorized);
  // Use token to authorize further requests
  adminConnection.headers = {
    Authorization: `Bearer ${adminAuthorized.token.access}`,
  };
  // Generate a random notification template update payload
  const updateBody: IShoppingMallNotificationTemplate.IUpdate = {
    templateCode: `code_${RandomGenerator.alphabets(5)}`,
    templateName: `Name ${RandomGenerator.name(2)}`,
    content: RandomGenerator.paragraph({ sentences: 3 }),
    parameters: JSON.stringify({ param1: "value1", param2: 2 }),
    deletedAt: null,
  };
  // Random UUID to simulate templateId
  const fakeTemplateId = typia.random<string & tags.Format<"uuid">>();
  // 2. Administrator sends PUT request to update notification template
  const response =
    await api.functional.shoppingMall.administrator.notificationTemplates.update(
      adminConnection,
      {
        templateId: fakeTemplateId,
        body: updateBody,
      },
    );
  // 3. Assert the response
  typia.assert(response);
  // Validate fields match input
  TestValidator.equals(
    "templateCode matches",
    response.templateCode,
    updateBody.templateCode,
  );
  TestValidator.equals(
    "templateName matches",
    response.templateName,
    updateBody.templateName,
  );
  TestValidator.equals("content matches", response.content, updateBody.content);
  TestValidator.equals(
    "parameters matches",
    response.parameters,
    updateBody.parameters,
  );
  TestValidator.equals(
    "deletedAt matches",
    response.deletedAt,
    updateBody.deletedAt,
  );
  // 4. Verify authorization enforcement: non-admin should fail
  const nonAdminConnection: api.IConnection = { host: connection.host };
  await TestValidator.error("unauthorized update attempt", async () => {
    await api.functional.shoppingMall.administrator.notificationTemplates.update(
      nonAdminConnection,
      {
        templateId: fakeTemplateId,
        body: updateBody,
      },
    );
  });
}
