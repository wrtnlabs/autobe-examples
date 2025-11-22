import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconPoliticalDiscussionSystemAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPoliticalDiscussionSystemAdministrator";
import type { IEconPoliticalDiscussionUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPoliticalDiscussionUser";

export async function test_api_admin_user_deletion_non_existent_account(
  connection: api.IConnection,
) {
  // 1. Authenticate as system administrator
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const systemAdministrator: IEconPoliticalDiscussionSystemAdministrator.IAuthorized =
    await api.functional.auth.systemAdministrator.join.create(connection, {
      body: {
        display_name: "System Administrator",
        email: adminEmail,
        status: "active",
      } satisfies IEconPoliticalDiscussionUser.ICreate,
    });
  typia.assert(systemAdministrator);

  // 2. Generate non-existent user UUID for deletion attempt
  const nonExistentUserId = typia.random<string & tags.Format<"uuid">>();

  // 3. Attempt to delete non-existent user account and verify error handling
  await TestValidator.error(
    "system administrator should receive 404 error when attempting to delete non-existent user",
    async () => {
      await api.functional.econPoliticalDiscussion.systemAdministrator.users.erase(
        connection,
        {
          userId: nonExistentUserId,
        },
      );
    },
  );
}
