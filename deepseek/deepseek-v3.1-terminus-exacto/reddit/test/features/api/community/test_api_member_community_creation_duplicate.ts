import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAuthorizationToken";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunityCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityCategory";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";

/**
 * Test community creation with duplicate name or slug validation.
 *
 * This test validates that the platform properly enforces uniqueness
 * constraints for community names and slugs across all member accounts. It
 * creates an initial community and then attempts to create duplicate
 * communities with conflicting identifiers to ensure proper error handling and
 * validation.
 */
export async function test_api_member_community_creation_duplicate(
  connection: api.IConnection,
) {
  // Step 1: Create first member account
  const firstMemberEmail = typia.random<string & tags.Format<"email">>();
  const firstMember = await api.functional.auth.member.join(connection, {
    body: {
      email: firstMemberEmail,
      password: "password123",
      display_name: RandomGenerator.name(2),
      href: "https://example.com/register",
      referrer: "https://example.com",
    } satisfies ICommunityPlatformMember.ICreate,
  });
  typia.assert(firstMember);

  // Step 2: Create initial community with unique name and slug
  const initialCommunityName = RandomGenerator.paragraph({ sentences: 2 });
  const initialCommunitySlug = RandomGenerator.alphaNumeric(10).toLowerCase();

  const initialCommunity =
    await api.functional.communityPlatform.member.communities.create(
      connection,
      {
        body: {
          name: initialCommunityName,
          slug: initialCommunitySlug,
          description: RandomGenerator.content({ paragraphs: 1 }),
          privacy: "public",
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(initialCommunity);
  TestValidator.equals(
    "initial community name matches",
    initialCommunity.name,
    initialCommunityName,
  );
  TestValidator.equals(
    "initial community slug matches",
    initialCommunity.slug,
    initialCommunitySlug,
  );

  // Step 3: Create second member account
  const secondMemberEmail = typia.random<string & tags.Format<"email">>();
  const secondMember = await api.functional.auth.member.join(connection, {
    body: {
      email: secondMemberEmail,
      password: "password456",
      display_name: RandomGenerator.name(2),
      href: "https://example.com/register",
      referrer: "https://example.com",
    } satisfies ICommunityPlatformMember.ICreate,
  });
  typia.assert(secondMember);

  // Step 4: Test duplicate name validation (same name, different slug)
  await TestValidator.error(
    "should reject duplicate community name",
    async () => {
      await api.functional.communityPlatform.member.communities.create(
        connection,
        {
          body: {
            name: initialCommunityName, // Same name
            slug: RandomGenerator.alphaNumeric(10).toLowerCase(), // Different slug
            description: RandomGenerator.content({ paragraphs: 1 }),
            privacy: "public",
          } satisfies ICommunityPlatformCommunity.ICreate,
        },
      );
    },
  );

  // Step 5: Test duplicate slug validation (same slug, different name)
  await TestValidator.error(
    "should reject duplicate community slug",
    async () => {
      await api.functional.communityPlatform.member.communities.create(
        connection,
        {
          body: {
            name: RandomGenerator.paragraph({ sentences: 2 }), // Different name
            slug: initialCommunitySlug, // Same slug
            description: RandomGenerator.content({ paragraphs: 1 }),
            privacy: "public",
          } satisfies ICommunityPlatformCommunity.ICreate,
        },
      );
    },
  );

  // Step 6: Test duplicate name and slug validation (both identical)
  await TestValidator.error(
    "should reject duplicate community name and slug",
    async () => {
      await api.functional.communityPlatform.member.communities.create(
        connection,
        {
          body: {
            name: initialCommunityName, // Same name
            slug: initialCommunitySlug, // Same slug
            description: RandomGenerator.content({ paragraphs: 1 }),
            privacy: "public",
          } satisfies ICommunityPlatformCommunity.ICreate,
        },
      );
    },
  );

  // Step 7: Verify successful creation with unique name and slug
  const uniqueCommunity =
    await api.functional.communityPlatform.member.communities.create(
      connection,
      {
        body: {
          name: RandomGenerator.paragraph({ sentences: 2 }),
          slug: RandomGenerator.alphaNumeric(10).toLowerCase(),
          description: RandomGenerator.content({ paragraphs: 1 }),
          privacy: "public",
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(uniqueCommunity);
  TestValidator.notEquals(
    "new community name should differ from initial",
    uniqueCommunity.name,
    initialCommunityName,
  );
  TestValidator.notEquals(
    "new community slug should differ from initial",
    uniqueCommunity.slug,
    initialCommunitySlug,
  );
}
