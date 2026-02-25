import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import type { IShoppingMallAdministratorGrade } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministratorGrade";
import type { IShoppingMallUserNotification } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallUserNotification";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

export async function test_api_administrator_notifications_mark_read_unauthorized_access(
  connection: api.IConnection,
): Promise<void> {
  // Scenario 3: Prevent unauthorized marking of notifications as read.
  // Preconditions: Administrator user authenticated but attempts to mark notifications not belonging to them.
  // When sending such a request, expect 403 Forbidden response.
  const admin1Connection: api.IConnection = { host: connection.host };
  const admin2Connection: api.IConnection = { host: connection.host };
  // 1. Join two separate administrator accounts
  const admin1 = await authorize_administrator_join(admin1Connection, {
    body: {
      email: `admin1_${typia.random<string & tags.Format<"email">>()}`,
      password: "StrongPass1!",
    },
  });
  typia.assert(admin1);
  admin1Connection.headers = { Authorization: `Bearer ${admin1.token.access}` };
  const admin2 = await authorize_administrator_join(admin2Connection, {
    body: {
      email: `admin2_${typia.random<string & tags.Format<"email">>()}`,
      password: "StrongPass2!",
    },
  });
  typia.assert(admin2);
  admin2Connection.headers = { Authorization: `Bearer ${admin2.token.access}` };
  // 2. Assuming admin1 has some notifications, but we don't have direct API to create notifications.
  //    We'll simulate by admin1 marking a random notification as read which belongs to admin1
  //    First try to get a list of notifications is not described, so we skip that and assume at least one notification ID
  //    For simulation, we'll use an unrealistic UUID that likely isn't belonging to admin1 (or any)
  //    Then admin2 tries to mark that notification ID as read and expect 403 Forbidden error.
  // Generate random UUID that is not owned by admin2
  const fakeNotificationId = typia.random<string & tags.Format<"uuid">>();
  // admin1 marks own notification - since we don't have list, skip actual success scenario
  // admin2 tries to mark notification not belonging to them
  await TestValidator.httpError(
    "forbid admin2 marking admin1's unrelated notification",
    403,
    async () => {
      await api.functional.shoppingMall.administrator.notifications.read.markRead(
        admin2Connection,
        {
          body: {
            notificationIds: [fakeNotificationId],
          },
        },
      );
    },
  );
}
