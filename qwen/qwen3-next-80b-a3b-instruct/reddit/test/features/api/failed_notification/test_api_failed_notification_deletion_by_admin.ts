import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
export async function test_api_failed_notification_deletion_by_admin(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create admin connection and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      href: "https://example.com/join",
      referrer: "https://example.com",
    } satisfies ICommunityPlatformAdmin.IJoin,
  });
  // Step 2: Generate a random failed notification ID
  const failedId = typia.random<string & tags.Format<"uuid">>();
  // Step 3: Delete the failed notification (first call should succeed)
  await api.functional.communityPlatform.admin.failed_notifications.erase(
    adminConnection,
    {
      failedId,
    },
  );
  // Step 4: Verify deletion was permanent by attempting to delete again
  // This should throw a 404 error since the record no longer exists
  await TestValidator.error(
    "deleted failed notification should not be accessible (404)",
    async () => {
      await api.functional.communityPlatform.admin.failed_notifications.erase(
        adminConnection,
        {
          failedId,
        },
      );
    },
  );
}
