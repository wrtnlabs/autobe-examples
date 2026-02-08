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

export async function test_api_notification_log_creation_minimal_event(
  connection: api.IConnection,
): Promise<void> {
  // Authenticate as administrator
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_administrator_join(adminConnection, {
    body: {},
  });
  adminConnection.headers = {
    ...adminConnection.headers,
    Authorization: `Bearer ${adminAuth.token.access}`,
  };
  // Prepare minimal valid notification log entry
  const body: IShoppingMallNotificationLog.ICreate = {
    event_type: "system",
  };
  // Create notification log entry
  const log =
    await generate_random_shopping_mall_administrator_notification_logs_create_notification_log(
      adminConnection,
      { body },
    );
  typia.assert(log);
  // Validate expected fields according to actual returned type
  TestValidator.predicate(
    "event_type is present",
    "event_type" in log && log.event_type === "system"
  );
  TestValidator.predicate(
    "created_at is present",
    "created_at" in log && log.created_at !== undefined && log.created_at !== null,
  );
  TestValidator.predicate(
    "updated_at is present",
    "updated_at" in log && log.updated_at !== undefined && log.updated_at !== null,
  );
}
