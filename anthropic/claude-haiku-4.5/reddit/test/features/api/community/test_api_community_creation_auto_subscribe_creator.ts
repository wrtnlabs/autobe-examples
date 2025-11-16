import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdministrator";
import type { ICommunityPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCategory";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";

/**
 * Test community creation with automatic creator subscription.
 *
 * Validates that when a member creates a new community, they are automatically
 * subscribed as the first member. This test ensures the subscriber_count is 1
 * after community creation, reflecting the creator's automatic subscription.
 *
 * Test flow:
 *
 * 1. Create administrator account
 * 2. Create a category for community classification
 * 3. Create member account (the community creator)
 * 4. Create a new community with the member
 * 5. Verify subscriber_count equals 1 (creator's automatic subscription)
 * 6. Confirm creator relationship is properly established
 */
export async function test_api_community_creation_auto_subscribe_creator(
  connection: api.IConnection,
) {
  // Step 1: Create administrator account
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminData = {
    email: adminEmail,
    password: RandomGenerator.alphabets(10),
    username: RandomGenerator.alphabets(8),
    name: RandomGenerator.name(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies ICommunityPlatformAdministrator.ICreate;

  const admin = await api.functional.auth.administrator.join(connection, {
    body: adminData,
  });
  typia.assert(admin);

  // Step 2: Create a category
  const categoryData = {
    name: RandomGenerator.paragraph({ sentences: 1, wordMin: 2, wordMax: 4 }),
    slug: RandomGenerator.alphabets(8),
    display_order: 1,
    description: RandomGenerator.paragraph({ sentences: 2 }),
  } satisfies ICommunityPlatformCategory.ICreate;

  const category =
    await api.functional.communityPlatform.administrator.categories.create(
      connection,
      {
        body: categoryData,
      },
    );
  typia.assert(category);

  // Step 3: Create member account (community creator)
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberData = {
    email: memberEmail,
    username: RandomGenerator.alphabets(8),
    password: RandomGenerator.alphabets(10),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies ICommunityPlatformMember.ICreate;

  const member = await api.functional.auth.member.join(connection, {
    body: memberData,
  });
  typia.assert(member);

  // Step 4: Create community
  const communityData = {
    name: RandomGenerator.paragraph({ sentences: 1, wordMin: 2, wordMax: 5 }),
    identifier: RandomGenerator.alphabets(8),
    description: RandomGenerator.paragraph({
      sentences: 2,
      wordMin: 3,
      wordMax: 8,
    }),
    visibility: "public" as const,
    post_creation_restriction: "open_to_all" as const,
    post_type_restriction: "all_types" as const,
    category_slug: category.slug,
  } satisfies ICommunityPlatformCommunity.ICreate;

  const community =
    await api.functional.communityPlatform.member.communities.create(
      connection,
      {
        body: communityData,
      },
    );
  typia.assert(community);

  // Step 5: Verify subscriber_count equals 1 (creator's automatic subscription)
  TestValidator.equals(
    "creator should be automatically subscribed with subscriber_count = 1",
    community.subscriber_count,
    1,
  );

  // Step 6: Verify creator relationship
  TestValidator.equals(
    "community creator should match the member who created it",
    community.creator.id,
    member.id,
  );

  // Additional verification: Verify category was properly assigned
  TestValidator.equals(
    "community should be assigned to the correct category",
    community.category.slug,
    category.slug,
  );

  // Verify community basic properties
  TestValidator.equals(
    "community name should match the input",
    community.name,
    communityData.name,
  );

  TestValidator.equals(
    "community identifier should match the input",
    community.identifier,
    communityData.identifier,
  );

  TestValidator.predicate(
    "community post_count should be 0 for new community",
    community.post_count === 0,
  );

  TestValidator.predicate(
    "community comment_count should be 0 for new community",
    community.comment_count === 0,
  );
}
