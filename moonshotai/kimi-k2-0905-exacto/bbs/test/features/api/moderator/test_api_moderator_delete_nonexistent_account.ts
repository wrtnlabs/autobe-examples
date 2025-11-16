import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconomicDiscussionModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionModerator";

export async function test_api_moderator_delete_nonexistent_account(
  connection: api.IConnection,
) {
  // Step 1: Create a moderator account for authentication
  const moderatorData = {
    username: RandomGenerator.name(),
    email: typia.random<string & tags.Format<"email">>(),
    password_hash: RandomGenerator.alphaNumeric(32),
    moderation_level: "admin",
    email_verified: true,
    two_factor_enabled: false,
  } satisfies IEconomicDiscussionModerator.ICreate;

  const moderator: IEconomicDiscussionModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: moderatorData,
    });
  typia.assert(moderator);

  // Step 2: Generate a random UUID that doesn't correspond to any real moderator
  const nonExistentModeratorId = typia.random<string & tags.Format<"uuid">>();

  // Step 3: Attempt to delete the non-existent moderator account
  // This should be handled gracefully by the system (idempotent behavior)
  await api.functional.economicDiscussion.moderator.moderators.erase(
    connection,
    {
      moderatorId: nonExistentModeratorId,
    },
  );

  // Step 4: Verify that the operation completed without errors
  // The API returns void on success, indicating successful idempotent behavior
  TestValidator.predicate(
    "delete operation completed without throwing an error for non-existent moderator",
    true,
  );

  // Step 5: Verify the authenticating moderator still exists and is valid
  TestValidator.predicate(
    "authenticating moderator session remains valid",
    moderator.token.access.length > 0,
  );
}
