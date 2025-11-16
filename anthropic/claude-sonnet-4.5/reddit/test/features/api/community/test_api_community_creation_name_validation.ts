import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import type { IRedditCommunityCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunityModerator";

/**
 * Test community name validation rules and constraints.
 *
 * This test validates that the community creation endpoint properly enforces
 * naming rules including length constraints (3-21 characters), character set
 * restrictions (lowercase alphanumeric and underscores only), and uniqueness
 * requirements across the platform.
 *
 * Steps:
 *
 * 1. Authenticate as moderator to obtain required permissions
 * 2. Test minimum length boundary (2 chars - should fail)
 * 3. Test minimum length boundary (3 chars - should succeed)
 * 4. Test maximum length boundary (21 chars - should succeed)
 * 5. Test maximum length boundary (22 chars - should fail)
 * 6. Test uppercase rejection (should fail)
 * 7. Test space character rejection (should fail)
 * 8. Test hyphen character rejection (should fail)
 * 9. Test valid patterns (tech_news, gaming123, ask_reddit)
 * 10. Test uniqueness constraint by creating duplicate name
 */
export async function test_api_community_creation_name_validation(
  connection: api.IConnection,
) {
  // Step 1: Authenticate as moderator
  const moderator: IRedditCommunityCommunityModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: "securePassword123!",
        nickname: RandomGenerator.name(),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IRedditCommunityCommunityModerator.ICreate,
    });
  typia.assert(moderator);

  // Step 2: Test minimum length boundary - 2 characters (should fail)
  await TestValidator.error(
    "community name with 2 characters should be rejected",
    async () => {
      await api.functional.redditCommunity.moderator.communities.create(
        connection,
        {
          body: {
            name: "ab",
            display_title: "Test Community",
            description: "Test description",
            rules: "Be respectful",
          } satisfies IRedditCommunityCommunity.ICreate,
        },
      );
    },
  );

  // Step 3: Test minimum length boundary - 3 characters (should succeed)
  const minLengthCommunity: IRedditCommunityCommunity =
    await api.functional.redditCommunity.moderator.communities.create(
      connection,
      {
        body: {
          name: "abc",
          display_title: "Min Length Test",
          description: "Testing minimum length boundary",
          rules: "Community rules",
        } satisfies IRedditCommunityCommunity.ICreate,
      },
    );
  typia.assert(minLengthCommunity);
  TestValidator.equals("min length name", minLengthCommunity.name, "abc");

  // Step 4: Test maximum length boundary - 21 characters (should succeed)
  const maxLengthCommunity: IRedditCommunityCommunity =
    await api.functional.redditCommunity.moderator.communities.create(
      connection,
      {
        body: {
          name: "a".repeat(21),
          display_title: "Max Length Test",
          description: "Testing maximum length boundary",
          rules: "Community rules",
        } satisfies IRedditCommunityCommunity.ICreate,
      },
    );
  typia.assert(maxLengthCommunity);
  TestValidator.equals("max length name", maxLengthCommunity.name.length, 21);

  // Step 5: Test maximum length boundary - 22 characters (should fail)
  await TestValidator.error(
    "community name with 22 characters should be rejected",
    async () => {
      await api.functional.redditCommunity.moderator.communities.create(
        connection,
        {
          body: {
            name: "b".repeat(22),
            display_title: "Test Community",
            description: "Test description",
            rules: "Be respectful",
          } satisfies IRedditCommunityCommunity.ICreate,
        },
      );
    },
  );

  // Step 6: Test uppercase rejection (should fail)
  await TestValidator.error(
    "community name with uppercase letters should be rejected",
    async () => {
      await api.functional.redditCommunity.moderator.communities.create(
        connection,
        {
          body: {
            name: "Tech_News",
            display_title: "Tech News",
            description: "Technology news",
            rules: "Stay on topic",
          } satisfies IRedditCommunityCommunity.ICreate,
        },
      );
    },
  );

  // Step 7: Test space character rejection (should fail)
  await TestValidator.error(
    "community name with spaces should be rejected",
    async () => {
      await api.functional.redditCommunity.moderator.communities.create(
        connection,
        {
          body: {
            name: "tech news",
            display_title: "Tech News",
            description: "Technology news",
            rules: "Stay on topic",
          } satisfies IRedditCommunityCommunity.ICreate,
        },
      );
    },
  );

  // Step 8: Test hyphen character rejection (should fail)
  await TestValidator.error(
    "community name with hyphens should be rejected",
    async () => {
      await api.functional.redditCommunity.moderator.communities.create(
        connection,
        {
          body: {
            name: "tech-news",
            display_title: "Tech News",
            description: "Technology news",
            rules: "Stay on topic",
          } satisfies IRedditCommunityCommunity.ICreate,
        },
      );
    },
  );

  // Step 9: Test valid patterns
  const validNames = ["tech_news", "gaming123", "ask_reddit"] as const;

  for (const validName of validNames) {
    const validCommunity: IRedditCommunityCommunity =
      await api.functional.redditCommunity.moderator.communities.create(
        connection,
        {
          body: {
            name: validName,
            display_title: RandomGenerator.paragraph({ sentences: 2 }),
            description: RandomGenerator.paragraph({ sentences: 5 }),
            rules: RandomGenerator.paragraph({ sentences: 3 }),
          } satisfies IRedditCommunityCommunity.ICreate,
        },
      );
    typia.assert(validCommunity);
    TestValidator.equals(
      `valid name pattern ${validName}`,
      validCommunity.name,
      validName,
    );
  }

  // Step 10: Test uniqueness constraint
  const uniqueTestName = "unique_test_123";
  const firstCommunity: IRedditCommunityCommunity =
    await api.functional.redditCommunity.moderator.communities.create(
      connection,
      {
        body: {
          name: uniqueTestName,
          display_title: "Unique Test Community",
          description: "Testing uniqueness constraint",
          rules: "Community rules",
        } satisfies IRedditCommunityCommunity.ICreate,
      },
    );
  typia.assert(firstCommunity);
  TestValidator.equals(
    "first community created",
    firstCommunity.name,
    uniqueTestName,
  );

  await TestValidator.error(
    "duplicate community name should be rejected",
    async () => {
      await api.functional.redditCommunity.moderator.communities.create(
        connection,
        {
          body: {
            name: uniqueTestName,
            display_title: "Duplicate Community",
            description: "Attempting to create duplicate",
            rules: "Community rules",
          } satisfies IRedditCommunityCommunity.ICreate,
        },
      );
    },
  );
}
