import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import type { IRedditCommunityCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunityModerator";

/**
 * Test community name format validation rules to ensure names follow platform
 * conventions and URL compatibility requirements.
 *
 * This test validates that community names are properly restricted to ensure
 * URL compatibility, consistent naming conventions, and prevent problematic
 * characters. The platform enforces strict rules on community names to maintain
 * referential integrity and case-insensitive lookups.
 *
 * Steps:
 *
 * 1. Authenticate as moderator
 * 2. Attempt to create communities with various invalid names (too short, too
 *    long, uppercase, special chars, spaces)
 * 3. Attempt to create community with valid name format
 * 4. Verify only valid format is accepted
 *
 * Validation points:
 *
 * - Names shorter than 3 characters are rejected
 * - Names longer than 21 characters are rejected
 * - Uppercase letters are rejected (must be lowercase)
 * - Special characters except underscore are rejected
 * - Spaces are rejected
 * - Valid format (3-21 lowercase alphanumeric + underscore) is accepted
 */
export async function test_api_community_name_validation(
  connection: api.IConnection,
) {
  // 1. Authenticate as moderator
  const moderator: IRedditCommunityCommunityModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(12),
        nickname: RandomGenerator.name(),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IRedditCommunityCommunityModerator.ICreate,
    });
  typia.assert(moderator);

  // 2. Test name too short (< 3 characters)
  await TestValidator.error(
    "community name too short should fail",
    async () => {
      await api.functional.redditCommunity.moderator.communities.create(
        connection,
        {
          body: {
            name: "ab",
            display_title: RandomGenerator.paragraph({ sentences: 2 }),
            description: RandomGenerator.paragraph({ sentences: 5 }),
            rules: RandomGenerator.paragraph({ sentences: 3 }),
          } satisfies IRedditCommunityCommunity.ICreate,
        },
      );
    },
  );

  // 3. Test name too long (> 21 characters)
  await TestValidator.error("community name too long should fail", async () => {
    await api.functional.redditCommunity.moderator.communities.create(
      connection,
      {
        body: {
          name: "this_is_a_very_long_community_name_that_exceeds_limit",
          display_title: RandomGenerator.paragraph({ sentences: 2 }),
          description: RandomGenerator.paragraph({ sentences: 5 }),
          rules: RandomGenerator.paragraph({ sentences: 3 }),
        } satisfies IRedditCommunityCommunity.ICreate,
      },
    );
  });

  // 4. Test name with uppercase letters
  await TestValidator.error(
    "community name with uppercase should fail",
    async () => {
      await api.functional.redditCommunity.moderator.communities.create(
        connection,
        {
          body: {
            name: "TechCommunity",
            display_title: RandomGenerator.paragraph({ sentences: 2 }),
            description: RandomGenerator.paragraph({ sentences: 5 }),
            rules: RandomGenerator.paragraph({ sentences: 3 }),
          } satisfies IRedditCommunityCommunity.ICreate,
        },
      );
    },
  );

  // 5. Test name with special characters (not underscore)
  await TestValidator.error(
    "community name with special characters should fail",
    async () => {
      await api.functional.redditCommunity.moderator.communities.create(
        connection,
        {
          body: {
            name: "tech-community!",
            display_title: RandomGenerator.paragraph({ sentences: 2 }),
            description: RandomGenerator.paragraph({ sentences: 5 }),
            rules: RandomGenerator.paragraph({ sentences: 3 }),
          } satisfies IRedditCommunityCommunity.ICreate,
        },
      );
    },
  );

  // 6. Test name with spaces
  await TestValidator.error(
    "community name with spaces should fail",
    async () => {
      await api.functional.redditCommunity.moderator.communities.create(
        connection,
        {
          body: {
            name: "tech community",
            display_title: RandomGenerator.paragraph({ sentences: 2 }),
            description: RandomGenerator.paragraph({ sentences: 5 }),
            rules: RandomGenerator.paragraph({ sentences: 3 }),
          } satisfies IRedditCommunityCommunity.ICreate,
        },
      );
    },
  );

  // 7. Create community with valid name format (3-21 lowercase alphanumeric + underscore)
  const validCommunity: IRedditCommunityCommunity =
    await api.functional.redditCommunity.moderator.communities.create(
      connection,
      {
        body: {
          name: "tech_community_01",
          display_title: RandomGenerator.paragraph({ sentences: 2 }),
          description: RandomGenerator.paragraph({ sentences: 5 }),
          rules: RandomGenerator.paragraph({ sentences: 3 }),
        } satisfies IRedditCommunityCommunity.ICreate,
      },
    );
  typia.assert(validCommunity);

  // 8. Verify the created community has the correct name
  TestValidator.equals(
    "created community name matches",
    validCommunity.name,
    "tech_community_01",
  );
}
