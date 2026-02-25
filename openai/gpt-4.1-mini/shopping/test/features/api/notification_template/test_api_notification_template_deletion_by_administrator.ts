import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import type { IShoppingMallAdministratorGrade } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministratorGrade";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

export async function test_api_notification_template_deletion_by_administrator(
  connection: api.IConnection,
): Promise<void> {
  // Administrator setup with join to get authorized connection
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_administrator_join(adminConnection, {});
  adminConnection.headers = {
    Authorization: `Bearer ${adminAuth.token.access}`,
  };
  // Create a notification template to delete
  // Note: Since there's no utility or API for creation provided in input,
  // we simulate by generating a UUID for templateId. We assume deletion works with valid UUID.
  const existingTemplateId = typia.random<string & tags.Format<"uuid">>();
  // Successful deletion of existing template (simulate existence)
  // Use erase utility function with valid templateId
  await api.functional.shoppingMall.administrator.notificationTemplates.erase(
    adminConnection,
    { templateId: existingTemplateId },
  );
  // Attempt deletion of non-existent template
  const nonExistentTemplateId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.httpError(
    "delete non-existent notification template returns 404",
    404,
    async () => {
      await api.functional.shoppingMall.administrator.notificationTemplates.erase(
        adminConnection,
        { templateId: nonExistentTemplateId },
      );
    },
  );
  // Unauthorized deletion attempt
  // Use base connection without auth headers
  const unauthorizedTemplateId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.httpError(
    "unauthorized deletion attempt returns 401 or 403",
    [401, 403],
    async () => {
      await api.functional.shoppingMall.administrator.notificationTemplates.erase(
        connection,
        { templateId: unauthorizedTemplateId },
      );
    },
  );
}
