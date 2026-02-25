import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import type { IShoppingMallAdministratorGrade } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministratorGrade";
import type { IShoppingMallNotificationLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallNotificationLog";
import type { IShoppingMallNotificationTemplate } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallNotificationTemplate";
import type { IShoppingMallUserNotification } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallUserNotification";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

export async function test_api_administrator_notification_log_retrieval_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Administrator account creation and authentication
  const adminConnection: api.IConnection = { host: connection.host };
  const adminUser = await authorize_administrator_join(adminConnection, {
    body: {
      email:
        `admin+${RandomGenerator.alphaNumeric(8)}@test.com` satisfies string &
          tags.Format<"email">,
      password: "password1234" as string & tags.MinLength<8>,
    },
  });
  // After join, adminConnection.headers updated with Authorization bearer token
  // 2. Create a notification log entry to fetch
  // But since no creation API provided, we must rely on a random valid UUID
  // realizing perfect scenario fidelity not possible; we'll test with a random UUID
  // This test primarily validates authorized access and response format
  const logId = typia.random<string & tags.Format<"uuid">>();
  // 3. Authorized administrator fetches the notification log by logId
  const notificationLog =
    await api.functional.shoppingMall.administrator.notificationLogs.atNotificationLog(
      adminConnection,
      { logId },
    );
  // 4. Validate response
  typia.assert(notificationLog);
  // 5. Validate that required fields are presence and types
  TestValidator.predicate(
    "notification log has valid UUID id",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      notificationLog.id,
    ),
  );
  TestValidator.predicate(
    "notification log event_type is non-empty string",
    typeof notificationLog.event_type === "string" &&
      notificationLog.event_type.length > 0,
  );
  // 6. Validate presence and types of timestamps
  [notificationLog.created_at, notificationLog.updated_at].forEach(
    (ts, idx) => {
      TestValidator.predicate(
        `notification log timestamp ${idx} valid ISO string`,
        !isNaN(Date.parse(ts)),
      );
    },
  );
  // 7. Validate deleted_at is either null or ISO string
  if (notificationLog.deleted_at !== null) {
    TestValidator.predicate(
      "notification log deleted_at valid ISO string or null",
      !isNaN(Date.parse(notificationLog.deleted_at)),
    );
  }
  // 8. Validate nested optional notificationTemplate summary if present
  if (
    notificationLog.notificationTemplate !== null &&
    notificationLog.notificationTemplate !== undefined
  ) {
    typia.assert(notificationLog.notificationTemplate);
    TestValidator.predicate(
      "notificationTemplate.id is UUID",
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        notificationLog.notificationTemplate.id,
      ),
    );
  }
  // 9. Validate nested optional userNotification summary if present
  if (
    notificationLog.userNotification !== null &&
    notificationLog.userNotification !== undefined
  ) {
    typia.assert(notificationLog.userNotification);
    TestValidator.predicate(
      "userNotification.id is UUID",
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        notificationLog.userNotification.id,
      ),
    );
  }
  // 10. Validate nullable foreign key ids
  if (notificationLog.notification_template_id !== null) {
    TestValidator.predicate(
      "notification_template_id is UUID or null",
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        notificationLog.notification_template_id,
      ),
    );
  }
  if (notificationLog.user_notification_id !== null) {
    TestValidator.predicate(
      "user_notification_id is UUID or null",
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        notificationLog.user_notification_id,
      ),
    );
  }
}
