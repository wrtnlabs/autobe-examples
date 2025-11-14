import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPoliticalForumModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IPoliticalForumModerator";

export async function test_api_moderator_login_duplicate_email_block(
  connection: api.IConnection,
) {
  // Generate unique email for first moderator registration
  const duplicateEmail: string = typia.random<string & tags.Format<"email">>();

  // Create first moderator by authenticating with the duplicate email
  const firstModerator: IPoliticalForumModerator.IAuthorized =
    await api.functional.auth.moderator.login(connection, {
      body: duplicateEmail,
    });
  typia.assert(firstModerator);

  // Attempt to login with the same duplicate email again (should fail with error)
  await TestValidator.error("duplicate email login should fail", async () => {
    await api.functional.auth.moderator.login(connection, {
      body: duplicateEmail,
    });
  });
}
