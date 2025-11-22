import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconPoliticalDiscussionSystemAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPoliticalDiscussionSystemAdministrator";
import type { IEconPoliticalDiscussionUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPoliticalDiscussionUser";

export async function test_api_admin_user_email_lookup_nonexistent_account(
  connection: api.IConnection,
) {
  // Step 1: Create system administrator account for authentication
  const adminDisplayName = `TestAdmin_${RandomGenerator.alphaNumeric(8)}`;
  const adminEmail = typia.random<string & tags.Format<"email">>();

  const admin: IEconPoliticalDiscussionSystemAdministrator.IAuthorized =
    await api.functional.auth.systemAdministrator.join.create(connection, {
      body: {
        display_name: adminDisplayName,
        email: adminEmail,
        status: "active",
      } satisfies IEconPoliticalDiscussionUser.ICreate,
    });
  typia.assert(admin);

  // Step 2: Attempt to lookup non-existent email address
  const nonExistentEmail = typia.random<string & tags.Format<"email">>();

  await TestValidator.error(
    "should fail when looking up non-existent email address",
    async () => {
      await api.functional.econPoliticalDiscussion.systemAdministrator.users.email.at(
        connection,
        {
          email: nonExistentEmail,
        },
      );
    },
  );
}
