import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import type { IRedditCommunityCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunityModerator";

/**
 * Test field length validation for display_title, description, and rules
 * fields.
 *
 * This test validates that the community creation endpoint properly enforces
 * maximum length constraints on three critical text fields: display_title (100
 * chars), description (500 chars), and rules (500 chars).
 *
 * Test strategy:
 *
 * 1. Authenticate as moderator to obtain required JWT tokens
 * 2. Test display_title with 99, 100, and 101 characters
 * 3. Test description with 499, 500, and 501 characters
 * 4. Test rules with 499, 500, and 501 characters
 * 5. Verify that values at/below limits succeed and values exceeding limits fail
 */
export async function test_api_community_creation_field_length_constraints(
  connection: api.IConnection,
) {
  // Step 1: Authenticate as moderator
  const moderator: IRedditCommunityCommunityModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphabets(12),
        nickname: RandomGenerator.name(),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IRedditCommunityCommunityModerator.ICreate,
    });
  typia.assert(moderator);

  // Helper function to generate strings of exact length
  const generateString = (length: number): string => {
    return RandomGenerator.alphabets(length);
  };

  // Helper to create base community data
  const createBaseCommunityData = (): Omit<
    IRedditCommunityCommunity.ICreate,
    "display_title" | "description" | "rules"
  > => {
    return {
      name: RandomGenerator.alphabets(10),
      icon_url: typia.random<string & tags.Format<"uri">>(),
      banner_url: typia.random<string & tags.Format<"uri">>(),
    };
  };

  // Step 2: Test display_title with 99 characters (should succeed)
  const validDisplayTitle99 =
    await api.functional.redditCommunity.moderator.communities.create(
      connection,
      {
        body: {
          ...createBaseCommunityData(),
          name: RandomGenerator.alphabets(10),
          display_title: generateString(99),
          description: RandomGenerator.paragraph({ sentences: 5 }),
          rules: RandomGenerator.paragraph({ sentences: 5 }),
        } satisfies IRedditCommunityCommunity.ICreate,
      },
    );
  typia.assert(validDisplayTitle99);
  TestValidator.equals(
    "display_title with 99 chars should match",
    validDisplayTitle99.display_title.length,
    99,
  );

  // Step 3: Test display_title with 100 characters (should succeed)
  const validDisplayTitle100 =
    await api.functional.redditCommunity.moderator.communities.create(
      connection,
      {
        body: {
          ...createBaseCommunityData(),
          name: RandomGenerator.alphabets(10),
          display_title: generateString(100),
          description: RandomGenerator.paragraph({ sentences: 5 }),
          rules: RandomGenerator.paragraph({ sentences: 5 }),
        } satisfies IRedditCommunityCommunity.ICreate,
      },
    );
  typia.assert(validDisplayTitle100);
  TestValidator.equals(
    "display_title with 100 chars should match",
    validDisplayTitle100.display_title.length,
    100,
  );

  // Step 4: Test display_title with 101 characters (should fail)
  await TestValidator.error(
    "display_title with 101 chars should fail",
    async () => {
      await api.functional.redditCommunity.moderator.communities.create(
        connection,
        {
          body: {
            ...createBaseCommunityData(),
            name: RandomGenerator.alphabets(10),
            display_title: generateString(101),
            description: RandomGenerator.paragraph({ sentences: 5 }),
            rules: RandomGenerator.paragraph({ sentences: 5 }),
          } satisfies IRedditCommunityCommunity.ICreate,
        },
      );
    },
  );

  // Step 5: Test description with 499 characters (should succeed)
  const validDescription499 =
    await api.functional.redditCommunity.moderator.communities.create(
      connection,
      {
        body: {
          ...createBaseCommunityData(),
          name: RandomGenerator.alphabets(10),
          display_title: RandomGenerator.name(),
          description: generateString(499),
          rules: RandomGenerator.paragraph({ sentences: 5 }),
        } satisfies IRedditCommunityCommunity.ICreate,
      },
    );
  typia.assert(validDescription499);
  TestValidator.equals(
    "description with 499 chars should match",
    validDescription499.description.length,
    499,
  );

  // Step 6: Test description with 500 characters (should succeed)
  const validDescription500 =
    await api.functional.redditCommunity.moderator.communities.create(
      connection,
      {
        body: {
          ...createBaseCommunityData(),
          name: RandomGenerator.alphabets(10),
          display_title: RandomGenerator.name(),
          description: generateString(500),
          rules: RandomGenerator.paragraph({ sentences: 5 }),
        } satisfies IRedditCommunityCommunity.ICreate,
      },
    );
  typia.assert(validDescription500);
  TestValidator.equals(
    "description with 500 chars should match",
    validDescription500.description.length,
    500,
  );

  // Step 7: Test description with 501 characters (should fail)
  await TestValidator.error(
    "description with 501 chars should fail",
    async () => {
      await api.functional.redditCommunity.moderator.communities.create(
        connection,
        {
          body: {
            ...createBaseCommunityData(),
            name: RandomGenerator.alphabets(10),
            display_title: RandomGenerator.name(),
            description: generateString(501),
            rules: RandomGenerator.paragraph({ sentences: 5 }),
          } satisfies IRedditCommunityCommunity.ICreate,
        },
      );
    },
  );

  // Step 8: Test rules with 499 characters (should succeed)
  const validRules499 =
    await api.functional.redditCommunity.moderator.communities.create(
      connection,
      {
        body: {
          ...createBaseCommunityData(),
          name: RandomGenerator.alphabets(10),
          display_title: RandomGenerator.name(),
          description: RandomGenerator.paragraph({ sentences: 5 }),
          rules: generateString(499),
        } satisfies IRedditCommunityCommunity.ICreate,
      },
    );
  typia.assert(validRules499);
  TestValidator.equals(
    "rules with 499 chars should match",
    validRules499.rules.length,
    499,
  );

  // Step 9: Test rules with 500 characters (should succeed)
  const validRules500 =
    await api.functional.redditCommunity.moderator.communities.create(
      connection,
      {
        body: {
          ...createBaseCommunityData(),
          name: RandomGenerator.alphabets(10),
          display_title: RandomGenerator.name(),
          description: RandomGenerator.paragraph({ sentences: 5 }),
          rules: generateString(500),
        } satisfies IRedditCommunityCommunity.ICreate,
      },
    );
  typia.assert(validRules500);
  TestValidator.equals(
    "rules with 500 chars should match",
    validRules500.rules.length,
    500,
  );

  // Step 10: Test rules with 501 characters (should fail)
  await TestValidator.error("rules with 501 chars should fail", async () => {
    await api.functional.redditCommunity.moderator.communities.create(
      connection,
      {
        body: {
          ...createBaseCommunityData(),
          name: RandomGenerator.alphabets(10),
          display_title: RandomGenerator.name(),
          description: RandomGenerator.paragraph({ sentences: 5 }),
          rules: generateString(501),
        } satisfies IRedditCommunityCommunity.ICreate,
      },
    );
  });
}
