import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import type { IShoppingMallNotificationLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallNotificationLog";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";
import { generate_random_shopping_mall_administrator_notification_logs_create_notification_log } from "../../../generate/generate_random_shopping_mall_administrator_notification_logs_create_notification_log";
import { prepare_random_shopping_mall_notification_log } from "../../../prepare/prepare_random_shopping_mall_notification_log";

export async function test_api_notification_log_creation_with_metadata(
  connection: api.IConnection,
) {
  // 1. Create admin connection and authorize admin join
  const administratorConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_administrator_join(
    administratorConnection,
    {
      body: {},
    },
  );
  // Set authorization header for admin connection
  administratorConnection.headers = {
    Authorization: authorized.token.access,
  };
  // 2. Prepare full notification log creation data
  const eventMetadata = JSON.stringify({
    ip: "192.168.0.1",
    user_agent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
    detail: {
      action: "sent",
      description: "Notification sent to user",
    },
  });
  // Generate valid UUIDs for linked IDs
  const notificationTemplateId = typia.random<string & tags.Format<"uuid">>();
  const userNotificationId = typia.random<string & tags.Format<"uuid">>();
  // 3. Create notification log entry with full metadata
  const createdLog =
    await generate_random_shopping_mall_administrator_notification_logs_create_notification_log(
      administratorConnection,
      {
        body: {
          event_type: "sent",
          event_metadata: eventMetadata,
          notification_template_id: notificationTemplateId,
          user_notification_id: userNotificationId,
        },
      },
    );
  typia.assert(createdLog);
  // 4. Validate created log content exists
  TestValidator.predicate(
    "createdLog is defined",
    createdLog !== null && typeof createdLog === "object",
  );
}
