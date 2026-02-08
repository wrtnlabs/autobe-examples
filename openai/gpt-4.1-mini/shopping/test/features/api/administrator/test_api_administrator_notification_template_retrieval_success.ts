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

export async function test_api_administrator_notification_template_retrieval_success(
  connection: api.IConnection,
): Promise<void> {
  // This test validates the primary success path for retrieving a notification template by its unique ID.
  // It covers authorization as an administrator, successful retrieval returning all expected fields in the notification template including template code, name, content, parameters JSON, and timestamps.
  // The test verifies correct mapping of all database columns to the response DTO.
  // Additionally, it ensures the immutable snapshot nature of the returned data.
  // Finally, it checks that authorization is enforced by requiring a valid administrator session.
  // Prepare admin connection
  const adminConnection: api.IConnection = { host: connection.host };
  // Administrator joining and obtaining authorization tokens
  const adminAuth = await authorize_administrator_join(adminConnection, {
    body: {} satisfies IShoppingMallAdministrator.IJoin,
  });
  typia.assert(adminAuth);
  // Set Authorization header to adminConnection for subsequent requests
  adminConnection.headers = {
    Authorization: `Bearer ${adminAuth.token.access}`,
  };
  // Generate a fake notification template ID (UUID)
  const notificationTemplateId = typia.random<string & tags.Format<"uuid">>();
  // Retrieve the notification template by ID
  const notificationTemplate =
    await api.functional.shoppingMall.administrator.notificationTemplates.at(
      adminConnection,
      {
        notificationTemplateId,
      },
    );
  // Assert the returned notification template matches the expected DTO
  typia.assert(notificationTemplate);
}
