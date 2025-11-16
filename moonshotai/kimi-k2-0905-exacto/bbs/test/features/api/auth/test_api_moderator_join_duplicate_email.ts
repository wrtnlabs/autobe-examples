import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconomicDiscussionModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionModerator";

export async function test_api_moderator_join_duplicate_email(
  connection: api.IConnection,
) {
  // Create first moderator account with unique email
  const firstModeratorEmail = typia.random<string & tags.Format<"email">>();
  const firstModerator = await api.functional.auth.moderator.join(connection, {
    body: {
      username: RandomGenerator.name(),
      email: firstModeratorEmail,
      password_hash: RandomGenerator.alphaNumeric(16),
      moderation_level: "senior",
      email_verified: true,
    } satisfies IEconomicDiscussionModerator.ICreate,
  });
  typia.assert(firstModerator);

  // Verify first moderator was created successfully and email matches
  TestValidator.predicate(
    "first moderator email matches input",
    firstModerator.email === firstModeratorEmail,
  );

  // Attempt to create second moderator with same email
  // Note: This test validates that the email uniqueness constraint prevents duplicate registrations
  // The exact error handling behavior depends on the API implementation
  await TestValidator.error(
    "duplicate email should fail moderator registration",
    async () => {
      await api.functional.auth.moderator.join(connection, {
        body: {
          username: RandomGenerator.name(),
          email: firstModeratorEmail, // Same email as first moderator
          password_hash: RandomGenerator.alphaNumeric(16),
          moderation_level: "junior",
          email_verified: false,
        } satisfies IEconomicDiscussionModerator.ICreate,
      });
    },
  );

  // Test completed successfully - duplicate email prevention was tested
  TestValidator.predicate(
    "duplicate email constraint tested successfully",
    true,
  );
}
