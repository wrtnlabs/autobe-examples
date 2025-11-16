import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformCommunityRule } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityRule";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";

/**
 * Test that rule creation fails gracefully when targeting a non-existent
 * community.
 *
 * This test validates the system's error handling when attempting to create a
 * rule for a community that does not exist. The API should return a 404 Not
 * Found error, clearly indicating that the community resource cannot be found.
 *
 * The test ensures:
 *
 * 1. Moderator authentication is successful
 * 2. Attempting to create a rule for a non-existent community returns an error
 * 3. The error response properly indicates the community was not found
 * 4. No rule is created as a result of the failed operation
 */
export async function test_api_community_rule_creation_nonexistent_community(
  connection: api.IConnection,
) {
  // Authenticate as a moderator
  const moderator: ICommunityPlatformModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        username: RandomGenerator.alphabets(8),
        password: RandomGenerator.alphaNumeric(12),
        href: "https://community.example.com/auth/register",
        referrer: "https://community.example.com",
      } satisfies ICommunityPlatformModerator.ICreate,
    });
  typia.assert(moderator);

  // Attempt to create a rule for a non-existent community
  const nonExistentCommunityId = typia.random<string & tags.Format<"uuid">>();

  await TestValidator.error(
    "should fail when creating rule for non-existent community",
    async () => {
      await api.functional.communityPlatform.moderator.communities.rules.create(
        connection,
        {
          communityId: nonExistentCommunityId,
          body: {
            rule_number: 1,
            title: "No Spam or Advertising",
            description:
              "Do not post links to external websites or advertisements.",
          } satisfies ICommunityPlatformCommunityRule.ICreate,
        },
      );
    },
  );
}
