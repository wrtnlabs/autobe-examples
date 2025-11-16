import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdministrator";
import type { ICommunityPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCategory";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";

/**
 * Test community creation with optional description field omitted or set to
 * null.
 *
 * Validates that a member can successfully create a community without providing
 * a description field. The community is created with all required fields (name,
 * identifier, visibility, post_creation_restriction, post_type_restriction, and
 * category_slug) but the description is explicitly omitted, resulting in null.
 *
 * Workflow:
 *
 * 1. Admin creates a category for community classification
 * 2. Member registers and authenticates
 * 3. Member creates a community without description
 * 4. Verify response contains community with description set to null
 * 5. Verify all other fields are correctly populated
 */
export async function test_api_community_creation_with_minimal_description(
  connection: api.IConnection,
) {
  // Step 1: Create administrator account and set up category
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const admin: ICommunityPlatformAdministrator.IAuthorized =
    await api.functional.auth.administrator.join(connection, {
      body: {
        email: adminEmail,
        password: RandomGenerator.alphaNumeric(12),
        username: RandomGenerator.alphabets(8),
        name: RandomGenerator.name(),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies ICommunityPlatformAdministrator.ICreate,
    });
  typia.assert(admin);

  // Step 2: Create a category for community assignment
  const category: ICommunityPlatformCategory =
    await api.functional.communityPlatform.administrator.categories.create(
      connection,
      {
        body: {
          name: RandomGenerator.name(),
          slug: RandomGenerator.alphabets(8).toLowerCase(),
          display_order: 0,
        } satisfies ICommunityPlatformCategory.ICreate,
      },
    );
  typia.assert(category);

  // Step 3: Create and authenticate member
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberUsername = RandomGenerator.alphabets(10).toLowerCase();
  const memberPassword = RandomGenerator.alphaNumeric(12);

  const member: ICommunityPlatformMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: memberEmail,
        username: memberUsername,
        password: memberPassword,
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies ICommunityPlatformMember.ICreate,
    });
  typia.assert(member);

  // Step 4: Create community with minimal description (omitted/null)
  const communityName = RandomGenerator.name(2);
  const communityIdentifier = RandomGenerator.alphabets(8).toLowerCase();

  const community: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.member.communities.create(
      connection,
      {
        body: {
          name: communityName,
          identifier: communityIdentifier,
          visibility: "public",
          post_creation_restriction: "open_to_all",
          post_type_restriction: "all_types",
          category_slug: category.slug,
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);

  // Step 5: Validate response fields
  TestValidator.equals("community name matches", community.name, communityName);
  TestValidator.equals(
    "community identifier matches",
    community.identifier,
    communityIdentifier,
  );
  TestValidator.equals(
    "community visibility is public",
    community.visibility,
    "public",
  );
  TestValidator.equals(
    "community post creation restriction",
    community.post_creation_restriction,
    "open_to_all",
  );
  TestValidator.equals(
    "community post type restriction",
    community.post_type_restriction,
    "all_types",
  );
  TestValidator.equals(
    "community description is null",
    community.description,
    null,
  );
  TestValidator.equals(
    "category slug matches",
    community.category.slug,
    category.slug,
  );
  TestValidator.predicate(
    "subscriber count is 1",
    community.subscriber_count === 1,
  );
  TestValidator.predicate("post count is 0", community.post_count === 0);
  TestValidator.predicate("comment count is 0", community.comment_count === 0);
  TestValidator.predicate(
    "deleted_at is not set",
    community.deleted_at === null || community.deleted_at === undefined,
  );
}
