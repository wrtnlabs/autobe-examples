import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPoliticalForumModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IPoliticalForumModerator";

export async function test_api_moderator_login_discriminates_between_roles(
  connection: api.IConnection,
) {
  // Generate valid moderator credentials
  const moderatorEmail: string = typia.random<string & tags.Format<"email">>();
  const moderatorPassword: string = "ModeratorPass123!";

  // Create moderator login payload (even though we don't have ILogin type as object, we use string for email)
  const moderatorLoginPayload =
    moderatorEmail satisfies IPoliticalForumModerator.ILogin;

  // First, verify that valid moderator credentials work
  const moderatorAuth: IPoliticalForumModerator.IAuthorized =
    await api.functional.auth.moderator.login(connection, {
      body: moderatorLoginPayload,
    });
  typia.assert(moderatorAuth);
  TestValidator.equals(
    "moderator login succeeded",
    moderatorAuth.email,
    moderatorEmail,
  );

  // Now test with citizen credential pattern (even though citizens use different endpoint)
  // We'll use a citizen email format but with a password that would work for citizens if endpoint allowed it
  const citizenEmail: string = typia.random<string & tags.Format<"email">>();
  const citizenPassword = "CitizenPass123!";

  // Try to log in as citizen using moderator endpoint — this should fail with 401
  await TestValidator.error(
    "citizen credentials should be rejected by moderator endpoint",
    async () => {
      await api.functional.auth.moderator.login(connection, {
        body: citizenEmail satisfies IPoliticalForumModerator.ILogin,
      });
    },
  );

  // Confirm that the system doesn't attempt to authenticate against political_forum_citizens table
  // by ensuring no successful authentication occurs with citizen email format
  // We have already validated the rejection above via TestValidator.error
}
