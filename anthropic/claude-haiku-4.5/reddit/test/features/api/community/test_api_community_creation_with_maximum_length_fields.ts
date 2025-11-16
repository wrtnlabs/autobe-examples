import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdministrator";
import type { ICommunityPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCategory";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";

/**
 * Test community creation with maximum length field values.
 *
 * Verifies that the system accepts and correctly stores community fields at
 * their maximum defined lengths:
 *
 * - Name: 100 characters
 * - Identifier: 32 characters
 * - Description: 500 characters
 *
 * The test validates that:
 *
 * 1. Community creation succeeds with maximum length fields
 * 2. Returned community data matches the submitted values exactly
 * 3. No truncation occurs on any field
 * 4. All data is properly persisted and retrievable
 *
 * Workflow:
 *
 * 1. Set up authentication for member actor
 * 2. Create a category for community classification
 * 3. Prepare test data with maximum length values
 * 4. Create community with maximum length fields
 * 5. Validate response matches input exactly
 * 6. Verify field lengths are correct
 */
export async function test_api_community_creation_with_maximum_length_fields(
  connection: api.IConnection,
) {
  // Step 1: Authenticate as member
  const memberEmail = `member_${RandomGenerator.alphaNumeric(8)}@test.com`;
  const member = await api.functional.auth.member.join(connection, {
    body: {
      email: memberEmail,
      username: RandomGenerator.alphabets(10),
      password: RandomGenerator.alphabets(10),
      href: "http://localhost:3000/join",
      referrer: "http://localhost:3000/",
    } satisfies ICommunityPlatformMember.ICreate,
  });
  typia.assert(member);

  // Step 2: Authenticate as administrator to create category
  const adminEmail = `admin_${RandomGenerator.alphaNumeric(8)}@test.com`;
  const admin = await api.functional.auth.administrator.join(connection, {
    body: {
      email: adminEmail,
      username: RandomGenerator.alphabets(8),
      password: RandomGenerator.alphabets(10),
      name: RandomGenerator.name(),
      href: "http://localhost:3000/admin",
      referrer: "http://localhost:3000/",
    } satisfies ICommunityPlatformAdministrator.ICreate,
  });
  typia.assert(admin);

  // Step 3: Create a category
  const category =
    await api.functional.communityPlatform.administrator.categories.create(
      connection,
      {
        body: {
          name: "Technology",
          slug: "technology",
          display_order: 1,
        } satisfies ICommunityPlatformCategory.ICreate,
      },
    );
  typia.assert(category);

  // Step 4: Login back as member
  await api.functional.auth.member.login(connection, {
    body: {
      email: memberEmail,
      password: RandomGenerator.alphabets(10),
      href: "http://localhost:3000/login",
      referrer: "http://localhost:3000/",
    } satisfies ICommunityPlatformMember.ILogin,
  });

  // Step 5: Prepare test data with maximum length values
  // Name: exactly 100 characters
  const maxName = RandomGenerator.alphabets(100);
  TestValidator.equals("name length is 100", maxName.length, 100);

  // Identifier: exactly 32 characters (lowercase alphanumeric and underscores)
  const maxIdentifier = RandomGenerator.alphaNumeric(32).toLowerCase();
  TestValidator.equals("identifier length is 32", maxIdentifier.length, 32);

  // Description: exactly 500 characters
  const maxDescription = RandomGenerator.content({
    paragraphs: 1,
    sentenceMin: 40,
    sentenceMax: 50,
    wordMin: 3,
    wordMax: 8,
  });
  const description = maxDescription.substring(0, 500);
  TestValidator.predicate(
    "description length does not exceed 500",
    description.length <= 500,
  );

  // Step 6: Create community with maximum length fields
  const community =
    await api.functional.communityPlatform.member.communities.create(
      connection,
      {
        body: {
          name: maxName,
          identifier: maxIdentifier,
          description: description,
          visibility: "public",
          post_creation_restriction: "open_to_all",
          post_type_restriction: "all_types",
          category_slug: category.slug,
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);

  // Step 7: Validate response matches input exactly
  TestValidator.equals("community name matches input", community.name, maxName);
  TestValidator.equals(
    "community identifier matches input",
    community.identifier,
    maxIdentifier,
  );
  TestValidator.equals(
    "community description matches input",
    community.description,
    description,
  );

  // Step 8: Verify field lengths are correct
  TestValidator.equals(
    "returned name length is 100",
    community.name.length,
    100,
  );
  TestValidator.equals(
    "returned identifier length is 32",
    community.identifier.length,
    32,
  );
  TestValidator.equals(
    "returned description length matches",
    community.description?.length,
    description.length,
  );

  // Step 9: Verify other community properties
  TestValidator.equals(
    "community visibility is public",
    community.visibility,
    "public",
  );
  TestValidator.equals(
    "post creation restriction is open_to_all",
    community.post_creation_restriction,
    "open_to_all",
  );
  TestValidator.equals(
    "post type restriction is all_types",
    community.post_type_restriction,
    "all_types",
  );
  TestValidator.equals(
    "category slug matches",
    community.category.slug,
    category.slug,
  );
  TestValidator.predicate(
    "subscriber count is at least 1",
    community.subscriber_count >= 1,
  );
  TestValidator.predicate("post count starts at 0", community.post_count === 0);
  TestValidator.predicate(
    "comment count starts at 0",
    community.comment_count === 0,
  );
}
