import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformFailedNotification } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformFailedNotification";
import type { ICommunityPlatformFailedNotificationMetadata } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformFailedNotificationMetadata";
import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
export async function test_api_failed_notification_retrieval_by_admin(
  connection: api.IConnection,
): Promise<void> {
  // Create a new admin connection for authentication
  const adminConnection: api.IConnection = { host: connection.host };
  // Step 1: Register a new admin user using the utility function
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminJoinData = {
    email: adminEmail,
    href: "https://example.com/join",
    referrer: "https://example.com",
    ip: null,
  } satisfies ICommunityPlatformAdmin.IJoin;
  const adminAuthResult = await authorize_admin_join(adminConnection, {
    body: adminJoinData,
  });
  typia.assert(adminAuthResult);
  // Step 2: Generate a random but valid failed notification ID to retrieve
  const failedNotificationId = typia.random<string & tags.Format<"uuid">>();
  // Step 3: Retrieve the specific failed notification record using the admin connection
  const failedNotification =
    await api.functional.communityPlatform.admin.failed_notifications.at(
      adminConnection,
      { failedId: failedNotificationId },
    );
  // Step 4: Validate the retrieved notification has all required fields
  typia.assert(failedNotification);
}
