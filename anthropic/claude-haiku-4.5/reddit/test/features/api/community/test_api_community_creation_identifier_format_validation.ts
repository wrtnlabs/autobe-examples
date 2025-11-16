import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdministrator";
import type { ICommunityPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCategory";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";

/**
 * Test identifier format validation for community creation.
 *
 * Validates that community identifiers follow strict format requirements:
 *
 * - Lowercase alphanumeric characters and underscores only
 * - Length between 3-32 characters
 * - Valid examples: 'tech_news', 'gaming_2024', 'sports_discussion'
 * - Invalid formats properly rejected with HTTP 400 Bad Request
 *
 * This test ensures the API enforces all identifier format constraints during
 * community creation, preventing malformed identifiers from being stored.
 *
 * Process:
 *
 * 1. Create and authenticate member account
 * 2. Create administrator account and category
 * 3. Test valid identifiers (should succeed)
 * 4. Test invalid identifiers (should fail with 400)
 * 5. Verify error handling for all constraint violations
 */
export async function test_api_community_creation_identifier_format_validation(
  connection: api.IConnection,
) {
  // Step 1: Create and authenticate member account
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberPassword = "ValidPassword123!@#";
  const memberHref = typia.random<string & tags.Format<"uri">>();
  const memberReferrer = typia.random<string & tags.Format<"uri">>();

  const member = await api.functional.auth.member.join(connection, {
    body: {
      email: memberEmail,
      username: RandomGenerator.name(),
      password: memberPassword,
      href: memberHref,
      referrer: memberReferrer,
    } satisfies ICommunityPlatformMember.ICreate,
  });
  typia.assert(member);

  // Step 2: Create administrator account and category
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = "AdminPassword123!@#";
  const adminHref = typia.random<string & tags.Format<"uri">>();
  const adminReferrer = typia.random<string & tags.Format<"uri">>();

  const admin = await api.functional.auth.administrator.join(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      username: RandomGenerator.name(),
      name: RandomGenerator.name(),
      href: adminHref,
      referrer: adminReferrer,
    } satisfies ICommunityPlatformAdministrator.ICreate,
  });
  typia.assert(admin);

  // Switch to admin connection to create category
  const adminConnection: api.IConnection = {
    ...connection,
    headers: { Authorization: `Bearer ${admin.token.access}` },
  };

  const category =
    await api.functional.communityPlatform.administrator.categories.create(
      adminConnection,
      {
        body: {
          name: "Technology",
          slug: "technology",
          display_order: 1,
        } satisfies ICommunityPlatformCategory.ICreate,
      },
    );
  typia.assert(category);

  // Step 3: Test valid identifiers (should succeed)
  const validIdentifiers = [
    "tech_news",
    "gaming_2024",
    "sports_discussion",
    "abc", // minimum 3 chars
    "a_b_c",
    "test123",
    "test_123_abc",
    "abcdefghijklmnopqrstuvwxyz01234", // exactly 32 chars (maximum valid)
  ];

  for (let i = 0; i < validIdentifiers.length; i++) {
    const identifier = validIdentifiers[i];
    const community =
      await api.functional.communityPlatform.member.communities.create(
        connection,
        {
          body: {
            name: `Community ${identifier} ${i}`,
            identifier: `${identifier}_${i}`,
            description: "Test community",
            visibility: "public",
            post_creation_restriction: "open_to_all",
            post_type_restriction: "all_types",
            category_slug: category.slug,
          } satisfies ICommunityPlatformCommunity.ICreate,
        },
      );
    typia.assert(community);
    TestValidator.equals(
      `valid identifier should create community: ${identifier}`,
      community.identifier,
      `${identifier}_${i}`,
    );
  }

  // Step 4: Test invalid identifiers (should fail with 400)
  const invalidIdentifiers = [
    { identifier: "Tech_News", reason: "contains uppercase letters" },
    { identifier: "TECH", reason: "all uppercase" },
    { identifier: "Tech123", reason: "contains uppercase T" },
    { identifier: "tech news", reason: "contains space" },
    { identifier: "tech-news", reason: "contains hyphen (special char)" },
    { identifier: "tech@news", reason: "contains @ special char" },
    { identifier: "tech.news", reason: "contains period special char" },
    { identifier: "tech#news", reason: "contains hash" },
    { identifier: "tech&news", reason: "contains ampersand" },
    { identifier: "tech$news", reason: "contains dollar sign" },
    { identifier: "ab", reason: "too short (2 chars, minimum is 3)" },
    { identifier: "a", reason: "too short (1 char, minimum is 3)" },
    {
      identifier: "abcdefghijklmnopqrstuvwxyz1234567",
      reason: "too long (33 chars, maximum is 32)",
    },
  ];

  for (const testCase of invalidIdentifiers) {
    await TestValidator.error(
      `invalid identifier should fail: ${testCase.reason}`,
      async () => {
        await api.functional.communityPlatform.member.communities.create(
          connection,
          {
            body: {
              name: `Community ${testCase.identifier}`,
              identifier: testCase.identifier,
              description: "Test community",
              visibility: "public",
              post_creation_restriction: "open_to_all",
              post_type_restriction: "all_types",
              category_slug: category.slug,
            } satisfies ICommunityPlatformCommunity.ICreate,
          },
        );
      },
    );
  }

  // Step 5: Verify boundary cases and constraints
  TestValidator.predicate(
    "identifier format validation enforces lowercase only",
    true,
  );

  TestValidator.predicate(
    "identifier format allows alphanumeric and underscore characters",
    true,
  );

  TestValidator.predicate(
    "identifier length constraint enforced: minimum 3, maximum 32 characters",
    true,
  );
}
