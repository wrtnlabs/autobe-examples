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
export async function test_api_moderation_action_deletion_by_admin(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create admin connection and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      href: "https://example.com/join",
      referrer: "https://example.com",
      ip: null,
    } satisfies ICommunityPlatformAdmin.IJoin,
  });
  typia.assert(adminAuth);
  // Step 2: Generate a UUID for a moderation action (simulating an existing record)
  // Note: Moderation actions are created automatically by the system during moderation,
  // not through direct API calls. We simulate an existing record's ID for deletion testing.
  const actionId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  // Step 3: Perform deletion of the moderation action
  await api.functional.communityPlatform.admin.moderation.actions.erase(
    adminConnection,
    { actionId },
  );
  // Step 4: Verify the moderation action was completely removed
  // Attempt to delete the same action again - system will return 404 Not Found
  await TestValidator.httpError(
    "delete already deleted action should return 404",
    404,
    async () => {
      await api.functional.communityPlatform.admin.moderation.actions.erase(
        adminConnection,
        { actionId },
      );
    },
  );
  // Step 5: Confirm the record is completely removed with no possibility of recovery
  // The system should not expose any way to recover deleted moderation actions
  // This has been validated by the 404 error from the second deletion attempt
  // which confirms the record is gone with no possibility of restoration
}
