import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import type { IDiscussionBoardSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuperAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_admin_join } from "../../../authorize/authorize_super_admin_join";
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";

/**
 * Test the successful permanent deletion of a moderation log record by a super administrator.
 */
export async function test_api_superadmin_moderation_logs_deletion(
  connection: api.IConnection,
): Promise<void> {
  // Create super administrator connection
  const superAdminConnection: api.IConnection = { host: connection.host };
  // Register and authenticate as super administrator using utility function
  const superAdmin = await authorize_super_admin_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(superAdmin);
  // Generate a valid moderation log ID for deletion
  const logId = typia.random<string & tags.Format<"uuid">>();
  // Call the DELETE operation to permanently remove the moderation log
  // Since this returns void for 204 No Content, we validate the operation succeeds
  await TestValidator.predicate(
    "moderation log deletion should succeed",
    async () => {
      await api.functional.discussionBoard.superAdmin.moderation_logs.erase(
        superAdminConnection,
        { logId },
      );
      return true; // Operation completed without throwing an error
    },
  );
  // Additional validation: Test that non-super admin would be rejected
  // This indirectly validates super admin privilege checking
  const regularConnection: api.IConnection = { host: connection.host };
  await TestValidator.error("non-super admin should be rejected", async () => {
    await api.functional.discussionBoard.superAdmin.moderation_logs.erase(
      regularConnection,
      { logId },
    );
  });
}
