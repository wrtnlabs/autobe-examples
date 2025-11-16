import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdministrator";
import type { ICommunityPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCategory";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";

/**
 * Test that the community creator is automatically subscribed to their created
 * community.
 *
 * After creating a community, this test verifies that a subscription record
 * exists for the creator with the current timestamp, confirming that community
 * creators are automatically added to their own community's subscriber list.
 *
 * Steps:
 *
 * 1. Administrator creates a test category for community classification
 * 2. Member registers and authenticates to the platform
 * 3. Member creates a new community in the created category
 * 4. Verify that the community's subscriber_count is 1 (the creator)
 * 5. Validate that the creator is properly subscribed with correct metadata
 */
export async function test_api_community_creation_creator_auto_subscription(
  connection: api.IConnection,
) {
  // Step 1: Create administrator and set up test category
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const admin = await api.functional.auth.administrator.join(connection, {
    body: {
      email: adminEmail,
      password: RandomGenerator.alphabets(10),
      username: RandomGenerator.alphabets(8),
      name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies ICommunityPlatformAdministrator.ICreate,
  });
  typia.assert(admin);

  // Create a test category
  const categorySlug = RandomGenerator.alphabets(8);
  const category =
    await api.functional.communityPlatform.administrator.categories.create(
      connection,
      {
        body: {
          name: RandomGenerator.paragraph({ sentences: 2 }),
          slug: categorySlug,
          display_order: 1,
        } satisfies ICommunityPlatformCategory.ICreate,
      },
    );
  typia.assert(category);

  // Step 2: Register and authenticate member
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberUsername = RandomGenerator.alphabets(6);
  const memberPassword = RandomGenerator.alphabets(10);

  const member = await api.functional.auth.member.join(connection, {
    body: {
      email: memberEmail,
      username: memberUsername,
      password: memberPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies ICommunityPlatformMember.ICreate,
  });
  typia.assert(member);
  TestValidator.predicate("member should be authorized", member.id !== null);

  // Step 3: Create a community as the member
  const communityIdentifier = RandomGenerator.alphabets(8).toLowerCase();
  const communityName = RandomGenerator.paragraph({ sentences: 2 });

  const community =
    await api.functional.communityPlatform.member.communities.create(
      connection,
      {
        body: {
          name: communityName,
          identifier: communityIdentifier,
          description: RandomGenerator.content({ paragraphs: 1 }),
          visibility: "public",
          post_creation_restriction: "open_to_all",
          post_type_restriction: "all_types",
          category_slug: categorySlug,
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);
  TestValidator.predicate("community should be created", community.id !== null);

  // Step 4: Verify creator auto-subscription - subscriber_count should be 1
  TestValidator.equals(
    "community subscriber count should be 1 (creator auto-subscribed)",
    community.subscriber_count,
    1,
  );

  // Step 5: Verify the creator identity matches
  TestValidator.equals(
    "community creator should be the authenticated member",
    community.creator.id,
    member.id,
  );

  // Step 6: Verify community metadata is properly set
  TestValidator.equals(
    "community name should match creation input",
    community.name,
    communityName,
  );

  TestValidator.equals(
    "community identifier should match creation input",
    community.identifier,
    communityIdentifier,
  );

  TestValidator.equals(
    "community category slug should match",
    community.category.slug,
    categorySlug,
  );

  // Step 7: Verify timestamps are set correctly
  TestValidator.predicate(
    "community created_at should be set",
    community.created_at !== null && community.created_at !== undefined,
  );

  TestValidator.predicate(
    "community created_at should be a valid ISO datetime",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(community.created_at),
  );
}
