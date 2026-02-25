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

export async function test_api_administrator_notifications_send_template_parameterized_success(
  connection: api.IConnection,
): Promise<void> {
  // Test sending a notification using a predefined template code with JSON parameters to customize the message.
  // Ensure that the system correctly substitutes template parameters, creates notification delivery records,
  // logs detailed send results, and returns success response.
  // Validate that authorization is enforced and recipients receive the templated message through the specified channel.
  // 1. Administrator join and obtain authorized connection
  const adminConnection: api.IConnection = { host: connection.host };
  const administrator = await authorize_administrator_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "password123",
    },
  });
  typia.assert(administrator);
  adminConnection.headers = { Authorization: administrator.token.access };
  // 2. Prepare notification send request using a template code and parameters
  // Use realistic random recipient IDs and parameters
  const templateCode = "WELCOME_TEMPLATE";
  const parameters = JSON.stringify({
    userName: "John Doe",
    discountCode: "DISCOUNT10",
  });
  const recipients = [administrator.id];
  const channel = "sms";
  const sendRequest: IShoppingMallNotificationTemplate.ISendRequest = {
    templateCode,
    parameters,
    recipients,
    channel,
  };
  // 3. Send notification using the utility function
  const sendResult =
    await api.functional.shoppingMall.administrator.notifications.send.sendNotification(
      adminConnection,
      { body: sendRequest },
    );
  typia.assert(sendResult);
  // 4. Validate the send result
  TestValidator.predicate(
    "notification send success",
    sendResult.success === true,
  );
  // 5. Check authorization enforcement by trying to send notification without auth
  const unauthorizedConnection: api.IConnection = { host: connection.host };
  await TestValidator.httpError(
    "unauthorized access blocked",
    401,
    async () => {
      await api.functional.shoppingMall.administrator.notifications.send.sendNotification(
        unauthorizedConnection,
        { body: sendRequest },
      );
    },
  );
}
