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

export async function test_api_administrator_notifications_send_custom_content_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin authentication
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_administrator_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "securePass123",
    },
  });
  typia.assert(adminAuth);
  // Update adminConnection headers for authenticated calls
  adminConnection.headers ??= {};
  adminConnection.headers.Authorization = adminAuth.token.access;
  // 2. Prepare notification send request with custom content
  // Generate multiple recipient IDs (simulate UUIDs as strings)
  const recipients = [
    typia.random<string & tags.Format<"uuid">>(),
    typia.random<string & tags.Format<"uuid">>(),
  ];
  const content = `Important notification: ${RandomGenerator.paragraph({ sentences: 3 })}`;
  const channel = "email";
  const body: IShoppingMallNotificationTemplate.ISendRequest = {
    content,
    recipients,
    channel,
  };
  // 3. Send notification via custom content
  const sendResult =
    await api.functional.shoppingMall.administrator.notifications.send.sendNotification(
      adminConnection,
      { body },
    );
  typia.assert(sendResult);
  // 4. Validate send result is successful
  TestValidator.predicate(
    "notification send success",
    sendResult.success === true,
  );
  // 5. Further validation could include checking that logs and deliveries exist
  // but since this is E2E test scope and no API provided, we rely on success flag.
}
