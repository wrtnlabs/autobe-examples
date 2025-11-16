import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdministrator";
import type { ICommunityPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCategory";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";

/**
 * Test creation of a private community with comprehensive validation.
 *
 * This test validates the complete workflow of creating a private community on
 * the platform. A member authenticates, then creates a new community with
 * visibility set to 'private'. The test ensures that:
 *
 * 1. The community is created successfully with all required properties
 * 2. The visibility is correctly set to 'private' (not discoverable publicly)
 * 3. The authenticated member is assigned as the community creator
 * 4. The community is properly categorized
 * 5. Initial metrics are correct (1 subscriber for creator, 0 posts, 0 comments)
 * 6. The community identifier is unique and URL-safe
 * 7. All response fields match expected types and validation constraints
 *
 * Workflow:
 *
 * 1. Administrator authenticates and creates a test category
 * 2. Member registers/authenticates
 * 3. Member creates a private community with proper configuration
 * 4. Validate all response properties match expectations
 * 5. Verify community is properly configured with private visibility
 */
export async function test_api_community_creation_private_visibility(
  connection: api.IConnection,
) {
  // Step 1: Administrator authentication and category creation
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const administrator = await api.functional.auth.administrator.join(
    connection,
    {
      body: {
        email: adminEmail,
        password: RandomGenerator.alphabets(12),
        username: `admin_${RandomGenerator.alphaNumeric(8)}`,
        name: `Administrator ${RandomGenerator.name()}`,
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies ICommunityPlatformAdministrator.ICreate,
    },
  );
  typia.assert(administrator);

  // Create a test category for the private community
  const category =
    await api.functional.communityPlatform.administrator.categories.create(
      connection,
      {
        body: {
          name: `Test Category ${RandomGenerator.name()}`,
          slug: `test_${RandomGenerator.alphaNumeric(8)}`,
          description: RandomGenerator.paragraph({ sentences: 3 }),
          display_order: 1,
        } satisfies ICommunityPlatformCategory.ICreate,
      },
    );
  typia.assert(category);

  // Step 2: Member authentication
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberConnection = { ...connection, headers: {} };
  const member = await api.functional.auth.member.join(memberConnection, {
    body: {
      email: memberEmail,
      username: `member_${RandomGenerator.alphaNumeric(8)}`,
      password: RandomGenerator.alphabets(12),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies ICommunityPlatformMember.ICreate,
  });
  typia.assert(member);

  // Step 3: Create a private community
  const communityIdentifier =
    `private_${RandomGenerator.alphaNumeric(10)}`.toLowerCase();
  const communityName = `Private Community ${RandomGenerator.name()}`;
  const communityDescription = RandomGenerator.paragraph({ sentences: 4 });

  const privateCommunity =
    await api.functional.communityPlatform.member.communities.create(
      memberConnection,
      {
        body: {
          identifier: communityIdentifier,
          name: communityName,
          description: communityDescription,
          visibility: "private",
          post_creation_restriction: "open_to_all",
          post_type_restriction: "all_types",
          category_slug: category.slug,
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(privateCommunity);

  // Step 4: Validate community properties
  TestValidator.equals(
    "community identifier matches input",
    privateCommunity.identifier,
    communityIdentifier,
  );

  TestValidator.equals(
    "community name matches input",
    privateCommunity.name,
    communityName,
  );

  TestValidator.equals(
    "community description matches input",
    privateCommunity.description,
    communityDescription,
  );

  // Step 5: Verify visibility is private
  TestValidator.equals(
    "community visibility is set to private",
    privateCommunity.visibility,
    "private",
  );

  // Step 6: Verify creator is the authenticated member
  TestValidator.equals(
    "creator ID matches authenticated member",
    privateCommunity.creator.id,
    member.id,
  );

  // Step 7: Verify category assignment
  TestValidator.equals(
    "category slug matches requested category",
    privateCommunity.category.slug,
    category.slug,
  );

  TestValidator.equals(
    "category ID matches requested category",
    privateCommunity.category.id,
    category.id,
  );

  // Step 8: Verify initial metrics
  TestValidator.equals(
    "initial subscriber count is 1 (creator only)",
    privateCommunity.subscriber_count,
    1,
  );

  TestValidator.equals(
    "initial post count is 0",
    privateCommunity.post_count,
    0,
  );

  TestValidator.equals(
    "initial comment count is 0",
    privateCommunity.comment_count,
    0,
  );

  // Step 9: Verify post creation restriction
  TestValidator.equals(
    "post creation restriction matches input",
    privateCommunity.post_creation_restriction,
    "open_to_all",
  );

  // Step 10: Verify post type restriction
  TestValidator.equals(
    "post type restriction matches input",
    privateCommunity.post_type_restriction,
    "all_types",
  );

  // Step 11: Verify timestamps are present and valid
  TestValidator.predicate(
    "created_at timestamp is set",
    privateCommunity.created_at !== null &&
      privateCommunity.created_at !== undefined &&
      privateCommunity.created_at.length > 0,
  );

  TestValidator.predicate(
    "updated_at timestamp is set",
    privateCommunity.updated_at !== null &&
      privateCommunity.updated_at !== undefined &&
      privateCommunity.updated_at.length > 0,
  );

  // Step 12: Verify deleted_at is not set (community is active)
  TestValidator.predicate(
    "deleted_at is null for active community",
    privateCommunity.deleted_at === null ||
      privateCommunity.deleted_at === undefined,
  );

  // Step 13: Verify identifier is URL-safe (only lowercase, numbers, underscores)
  TestValidator.predicate(
    "identifier follows URL-safe pattern",
    /^[a-z0-9_]+$/.test(privateCommunity.identifier),
  );

  // Step 14: Verify identifier length constraints
  TestValidator.predicate(
    "identifier length is within 3-32 character bounds",
    privateCommunity.identifier.length >= 3 &&
      privateCommunity.identifier.length <= 32,
  );

  // Step 15: Verify name length constraints
  TestValidator.predicate(
    "name length is within 3-100 character bounds",
    privateCommunity.name.length >= 3 && privateCommunity.name.length <= 100,
  );

  // Step 16: Verify description length if present
  if (
    privateCommunity.description !== null &&
    privateCommunity.description !== undefined
  ) {
    TestValidator.predicate(
      "description length is within 0-500 character bounds",
      privateCommunity.description.length <= 500,
    );
  }

  // Step 17: Verify creator has valid properties
  TestValidator.predicate(
    "creator email format is valid",
    /^[a-z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[a-z0-9!#$%&'*+/=?^_`{|}~-]+)*@(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/i.test(
      privateCommunity.creator.email,
    ),
  );

  TestValidator.predicate(
    "creator email verified status is boolean",
    typeof privateCommunity.creator.email_verified === "boolean",
  );

  TestValidator.predicate(
    "creator karma score is non-negative integer",
    privateCommunity.creator.karma_score >= 0 &&
      Number.isInteger(privateCommunity.creator.karma_score),
  );

  TestValidator.predicate(
    "creator account status is one of valid states",
    ["active", "suspended", "pending_deletion", "deleted"].includes(
      privateCommunity.creator.account_status,
    ),
  );

  // Step 18: Verify category has valid properties
  TestValidator.predicate(
    "category name is non-empty",
    privateCommunity.category.name.length > 0,
  );

  TestValidator.predicate(
    "category is active",
    privateCommunity.category.is_active === true,
  );
}
