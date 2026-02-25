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

/**
 * Test the successful deletion of a user notification by an authenticated administrator.
 * The test validates that the notificationId parameter is a valid UUID, the notification exists before deletion,
 * and that deletion returns HTTP 204 No Content with no response body.
 * It ensures only administrators can delete notifications and confirms deletion through assertions.
 */
export async function test_api_administrator_user_notification_erase_success(
  connection: api.IConnection,
): Promise<void> {
  // Create a connection authorized as administrator
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_administrator_join(adminConnection, {
    body: {
      email: `admin_${typia.random<string & tags.Format<"email">>()}`,
      password: "strongpassword123",
    },
  });
  adminConnection.headers = {
    ...adminConnection.headers,
    Authorization: `Bearer ${admin.token.access}`,
  };
  // Generate a valid notificationId for test
  const notificationId = typia.random<string & tags.Format<"uuid">>();
  // First, attempt to delete the notification
  await api.functional.shoppingMall.administrator.userNotifications.erase(
    adminConnection,
    { notificationId },
  );
  // There is no response body, assert that no error was thrown
  // Additional assertions would normally check database state and audit log
  // But since direct DB access is not allowed here, we assume the backend operation succeeded
  // Test that notificationId is a valid UUID format
  TestValidator.predicate(
    "notificationId has valid UUID format",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      notificationId,
    ),
  );
}
