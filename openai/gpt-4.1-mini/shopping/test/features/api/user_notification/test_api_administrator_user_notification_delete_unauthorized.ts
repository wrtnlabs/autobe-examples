import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

export async function test_api_administrator_user_notification_delete_unauthorized(
  connection: api.IConnection,
): Promise<void> {
  // Use the base connection directly (no authentication)
  // Generate a random UUID for userNotificationId to attempt deletion.
  // This represents an existing or assumed notification to try deleting.
  const userNotificationId = typia.random<string & tags.Format<"uuid">>();
  // Attempt to delete without admin authentication
  await TestValidator.httpError(
    "should fail to delete user notification without admin auth",
    403,
    async () => {
      await api.functional.shoppingMall.administrator.userNotifications.erase(
        connection,
        { userNotificationId },
      );
    },
  );
  // Since the deletion is unauthorized, the notification should still exist.
  // However, given lack of retrieval API in the scenario, we limit the test to
  // asserting the forbidden error.
}
