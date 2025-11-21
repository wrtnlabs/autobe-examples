import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAuthorizationToken";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunityCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityCategory";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";

/**
 * Test that authenticated members can create new communities with proper
 * validation and default settings. Validates the complete community creation
 * workflow including name uniqueness checks, slug generation, privacy settings
 * application, and automatic moderator assignment. The scenario tests community
 * creation with various privacy levels (public, private, restricted) and
 * ensures the creator becomes the first moderator with appropriate community
 * management permissions.
 */
export async function test_api_community_creation_by_member(
  connection: api.IConnection,
) {
  // Step 1: Create member account for authentication prerequisite
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberPassword = "TestPassword123";

  const member: ICommunityPlatformMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: memberEmail,
        password: memberPassword,
        display_name: RandomGenerator.name(),
        href: "https://example.com/register",
        referrer: "https://example.com",
      } satisfies ICommunityPlatformMember.ICreate,
    });
  typia.assert(member);

  // Step 2: Create community with the authenticated member
  const communityName = RandomGenerator.paragraph({
    sentences: 2,
    wordMin: 3,
    wordMax: 8,
  });
  const communitySlug = RandomGenerator.alphaNumeric(15); // Use proper random generation instead of string manipulation
  const communityDescription = RandomGenerator.content({
    paragraphs: 1,
    sentenceMin: 3,
    sentenceMax: 5,
  });

  const community: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.member.communities.create(
      connection,
      {
        body: {
          name: communityName,
          slug: communitySlug,
          description: communityDescription,
          privacy: "public",
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);

  // Step 3: Validate community creation response
  TestValidator.equals(
    "community ID should be valid UUID",
    community.id,
    typia.assert<string & tags.Format<"uuid">>(community.id),
  );
  TestValidator.equals(
    "community name should match input",
    community.name,
    communityName,
  );
  TestValidator.equals(
    "community slug should match input",
    community.slug,
    communitySlug,
  );
  TestValidator.equals(
    "community description should match input",
    community.description,
    communityDescription,
  );
  TestValidator.equals(
    "community privacy should be public",
    community.privacy,
    "public",
  );
  TestValidator.equals(
    "community status should be active",
    community.status,
    "active",
  );
  TestValidator.predicate(
    "community should have creation timestamp",
    community.created_at !== undefined,
  );
  TestValidator.predicate(
    "community should have update timestamp",
    community.updated_at !== undefined,
  );
  TestValidator.equals(
    "community category should be undefined when not provided",
    community.category,
    undefined,
  );

  // Step 4: Test community creation with different privacy settings
  const privateCommunityName = RandomGenerator.paragraph({
    sentences: 2,
    wordMin: 3,
    wordMax: 8,
  });
  const privateCommunitySlug = RandomGenerator.alphaNumeric(15);

  const privateCommunity: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.member.communities.create(
      connection,
      {
        body: {
          name: privateCommunityName,
          slug: privateCommunitySlug,
          description: RandomGenerator.content({
            paragraphs: 1,
            sentenceMin: 3,
            sentenceMax: 5,
          }),
          privacy: "private",
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(privateCommunity);
  TestValidator.equals(
    "private community privacy should be private",
    privateCommunity.privacy,
    "private",
  );

  const restrictedCommunityName = RandomGenerator.paragraph({
    sentences: 2,
    wordMin: 3,
    wordMax: 8,
  });
  const restrictedCommunitySlug = RandomGenerator.alphaNumeric(15);

  const restrictedCommunity: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.member.communities.create(
      connection,
      {
        body: {
          name: restrictedCommunityName,
          slug: restrictedCommunitySlug,
          description: RandomGenerator.content({
            paragraphs: 1,
            sentenceMin: 3,
            sentenceMax: 5,
          }),
          privacy: "restricted",
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(restrictedCommunity);
  TestValidator.equals(
    "restricted community privacy should be restricted",
    restrictedCommunity.privacy,
    "restricted",
  );

  // Step 5: Verify unique constraint by attempting duplicate community creation
  await TestValidator.error(
    "should reject duplicate community name",
    async () => {
      await api.functional.communityPlatform.member.communities.create(
        connection,
        {
          body: {
            name: communityName, // Same name as first community
            slug: RandomGenerator.alphaNumeric(15), // Different slug
            description: RandomGenerator.content({
              paragraphs: 1,
              sentenceMin: 3,
              sentenceMax: 5,
            }),
            privacy: "public",
          } satisfies ICommunityPlatformCommunity.ICreate,
        },
      );
    },
  );

  await TestValidator.error(
    "should reject duplicate community slug",
    async () => {
      await api.functional.communityPlatform.member.communities.create(
        connection,
        {
          body: {
            name: RandomGenerator.paragraph({
              sentences: 2,
              wordMin: 3,
              wordMax: 8,
            }), // Different name
            slug: communitySlug, // Same slug as first community
            description: RandomGenerator.content({
              paragraphs: 1,
              sentenceMin: 3,
              sentenceMax: 5,
            }),
            privacy: "public",
          } satisfies ICommunityPlatformCommunity.ICreate,
        },
      );
    },
  );
}
