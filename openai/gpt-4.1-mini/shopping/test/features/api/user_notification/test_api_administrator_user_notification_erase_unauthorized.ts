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

export async function test_api_administrator_user_notification_erase_unauthorized(
  connection: api.IConnection,
): Promise<void> {
  // Scenario description:
  // Validate that a non-administrator user cannot delete a user notification.
  // Attempt deletion without any authentication should cause an authorization error.
  // Attempt deletion with an administrator role is not performed here since it implies
  // successful access. We'll test unauthorized explicitly.
  // Create user notification ID for testing
  const fakeNotificationId = typia.random<string & tags.Format<"uuid">>();
  // Test 1: Attempt deletion without authentication
  await TestValidator.httpError(
    "unauthorized deletion without token should fail with 403",
    403,
    async () => {
      // Use the base connection without auth headers
      await api.functional.shoppingMall.administrator.userNotifications.erase(
        connection,
        { notificationId: fakeNotificationId },
      );
    },
  );
  // Additional unauthorized tests can be performed if other actor connections
  // are available, but here only the base connection is given.
}
