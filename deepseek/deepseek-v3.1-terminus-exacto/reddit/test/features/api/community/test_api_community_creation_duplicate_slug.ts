import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAuthorizationToken";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunityCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityCategory";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";

/**
 * Test community creation with duplicate slug to validate slug uniqueness
 * enforcement. Ensures the system properly rejects community creation when the
 * proposed slug already exists, maintaining URL uniqueness across the
 * platform.
 */
export async function test_api_community_creation_duplicate_slug(
  connection: api.IConnection,
) {
  // Step 1: Create first member account
  const firstMemberEmail = typia.random<string & tags.Format<"email">>();
  const firstMember = await api.functional.auth.member.join(connection, {
    body: {
      email: firstMemberEmail,
      password: "password123",
      display_name: RandomGenerator.name(),
      href: "https://example.com/register",
      referrer: "https://example.com",
    } satisfies ICommunityPlatformMember.ICreate,
  });
  typia.assert(firstMember);

  // Step 2: Create initial community with specific slug
  const initialSlug = RandomGenerator.alphaNumeric(10);
  const firstCommunity =
    await api.functional.communityPlatform.member.communities.create(
      connection,
      {
        body: {
          name: RandomGenerator.paragraph({ sentences: 3 }),
          slug: initialSlug,
          description: RandomGenerator.content({ paragraphs: 2 }),
          privacy: "public",
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(firstCommunity);
  TestValidator.equals(
    "first community slug matches",
    firstCommunity.slug,
    initialSlug,
  );

  // Step 3: Create second member account
  const secondMemberEmail = typia.random<string & tags.Format<"email">>();
  const secondMember = await api.functional.auth.member.join(connection, {
    body: {
      email: secondMemberEmail,
      password: "password456",
      display_name: RandomGenerator.name(),
      href: "https://example.com/register",
      referrer: "https://example.com",
    } satisfies ICommunityPlatformMember.ICreate,
  });
  typia.assert(secondMember);

  // Step 4: Attempt to create community with duplicate slug using second member
  await TestValidator.error("duplicate slug creation should fail", async () => {
    await api.functional.communityPlatform.member.communities.create(
      connection,
      {
        body: {
          name: RandomGenerator.paragraph({ sentences: 3 }),
          slug: initialSlug, // Same slug as first community
          description: RandomGenerator.content({ paragraphs: 2 }),
          privacy: "public",
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  });

  // Step 5: Validate that non-duplicate slug creation still works
  const secondCommunity =
    await api.functional.communityPlatform.member.communities.create(
      connection,
      {
        body: {
          name: RandomGenerator.paragraph({ sentences: 3 }),
          slug: RandomGenerator.alphaNumeric(10), // Different slug
          description: RandomGenerator.content({ paragraphs: 2 }),
          privacy: "public",
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(secondCommunity);
  TestValidator.notEquals(
    "second community has different slug",
    secondCommunity.slug,
    initialSlug,
  );
}
