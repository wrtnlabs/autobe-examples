import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAuthorizationToken";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunityCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityCategory";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";

/**
 * Comprehensive validation testing for community creation API endpoint.
 *
 * This test verifies that the community creation endpoint properly enforces all
 * validation rules including character length requirements, naming conventions,
 * and content restrictions. The test creates a member account for
 * authentication context, then systematically tests various invalid input
 * scenarios to ensure proper error handling.
 */
export async function test_api_member_community_creation_validation(
  connection: api.IConnection,
) {
  // Step 1: Create member account for authentication context
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberPassword = "ValidPassword123";

  const member = await api.functional.auth.member.join(connection, {
    body: {
      email: memberEmail,
      password: memberPassword,
      display_name: RandomGenerator.name(),
      href: "https://example.com/register",
      referrer: "https://example.com",
    } satisfies ICommunityPlatformMember.ICreate,
  });
  typia.assert(member);

  // Step 2: Test valid community creation first
  const validCommunity =
    await api.functional.communityPlatform.member.communities.create(
      connection,
      {
        body: {
          name: RandomGenerator.paragraph({
            sentences: 2,
            wordMin: 3,
            wordMax: 7,
          }),
          slug: RandomGenerator.alphaNumeric(10),
          description: RandomGenerator.content({ paragraphs: 1 }),
          privacy: "public",
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(validCommunity);

  // Step 3: Test name length validation - too short (less than 3 characters)
  await TestValidator.error(
    "community name too short should fail",
    async () => {
      await api.functional.communityPlatform.member.communities.create(
        connection,
        {
          body: {
            name: "ab", // Only 2 characters
            slug: RandomGenerator.alphaNumeric(10),
            description: RandomGenerator.content({ paragraphs: 1 }),
            privacy: "public",
          } satisfies ICommunityPlatformCommunity.ICreate,
        },
      );
    },
  );

  // Step 4: Test name length validation - too long (more than 21 characters)
  await TestValidator.error("community name too long should fail", async () => {
    await api.functional.communityPlatform.member.communities.create(
      connection,
      {
        body: {
          name: RandomGenerator.paragraph({
            sentences: 10,
            wordMin: 5,
            wordMax: 8,
          }), // Very long name
          slug: RandomGenerator.alphaNumeric(10),
          description: RandomGenerator.content({ paragraphs: 1 }),
          privacy: "public",
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  });

  // Step 5: Test slug format validation - invalid characters
  await TestValidator.error(
    "slug with invalid characters should fail",
    async () => {
      await api.functional.communityPlatform.member.communities.create(
        connection,
        {
          body: {
            name: RandomGenerator.paragraph({
              sentences: 2,
              wordMin: 3,
              wordMax: 7,
            }),
            slug: "invalid slug with spaces", // Contains spaces
            description: RandomGenerator.content({ paragraphs: 1 }),
            privacy: "public",
          } satisfies ICommunityPlatformCommunity.ICreate,
        },
      );
    },
  );

  // Step 6: Test slug format validation - special characters
  await TestValidator.error(
    "slug with special characters should fail",
    async () => {
      await api.functional.communityPlatform.member.communities.create(
        connection,
        {
          body: {
            name: RandomGenerator.paragraph({
              sentences: 2,
              wordMin: 3,
              wordMax: 7,
            }),
            slug: "slug-with-$pecial-ch@racters", // Invalid characters
            description: RandomGenerator.content({ paragraphs: 1 }),
            privacy: "public",
          } satisfies ICommunityPlatformCommunity.ICreate,
        },
      );
    },
  );

  // Step 7: Test empty description validation
  await TestValidator.error("empty description should fail", async () => {
    await api.functional.communityPlatform.member.communities.create(
      connection,
      {
        body: {
          name: RandomGenerator.paragraph({
            sentences: 2,
            wordMin: 3,
            wordMax: 7,
          }),
          slug: RandomGenerator.alphaNumeric(10),
          description: "", // Empty description
          privacy: "public",
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  });

  // Step 8: Test invalid privacy setting
  await TestValidator.error("invalid privacy setting should fail", async () => {
    await api.functional.communityPlatform.member.communities.create(
      connection,
      {
        body: {
          name: RandomGenerator.paragraph({
            sentences: 2,
            wordMin: 3,
            wordMax: 7,
          }),
          slug: RandomGenerator.alphaNumeric(10),
          description: RandomGenerator.content({ paragraphs: 1 }),
          privacy: "invalid-privacy-value", // Invalid privacy value
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  });

  // Step 9: Verify valid community was created successfully
  TestValidator.equals(
    "valid community creation should succeed",
    validCommunity.name.length >= 3 && validCommunity.name.length <= 21,
    true,
  );
  TestValidator.equals(
    "valid community should have proper slug format",
    /^[a-zA-Z0-9_-]+$/.test(validCommunity.slug),
    true,
  );
  TestValidator.predicate(
    "valid community should have non-empty description",
    validCommunity.description.length > 0,
  );
  TestValidator.equals(
    "valid community should have valid privacy setting",
    ["public", "private", "restricted"].includes(validCommunity.privacy),
    true,
  );
}
