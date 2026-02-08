import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallUserNotification } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallUserNotification";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

export async function test_api_customer_notification_send_unknown_user(
  connection: api.IConnection,
): Promise<void> {
  // Test sending a notification to a non-existent user ID.
  const customerConnection: api.IConnection = { host: connection.host };
  // Use a random UUID for unknown user id
  const unknownUserId = typia.random<string & tags.Format<"uuid">>();
  // Prepare the body with unknown user id and some plausible template code and channel
  const body: IShoppingMallUserNotification.ISendRequest = {
    templateCode: "welcome", // Assuming 'welcome' is a valid template code
    ownerId: unknownUserId,
    channel: "email",
    parameters: {
      userName: "Unknown User",
    },
  };
  // We expect an error when sending notification to unknown user
  await TestValidator.error("send notification to unknown user", async () => {
    await api.functional.shoppingMall.customer.notifications.send.sendNotification(
      customerConnection,
      { body },
    );
  });
}
