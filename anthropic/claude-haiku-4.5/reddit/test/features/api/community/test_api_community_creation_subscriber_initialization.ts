import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdministrator";
import type { ICommunityPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCategory";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";

/**
 * Test community creation with automatic subscriber initialization.
 *
 * Validates that when a member creates a community, the creator is
 * automatically subscribed as the first community member. The community should
 * be initialized with subscriber_count=1 immediately upon creation,
 * representing the creator's automatic subscription.
 *
 * Process:
 *
 * 1. Create and authenticate an administrator account
 * 2. Create a community category through administrator endpoint
 * 3. Create and authenticate a member account
 * 4. Create a new community with valid parameters
 * 5. Verify subscriber_count is exactly 1 (the creator)
 * 6. Validate the response structure and relationships
 */
export async function test_api_community_creation_subscriber_initialization(
  connection: api.IConnection,
) {
  // Step 1: Create administrator and category
  const adminEmail = `admin_${RandomGenerator.alphaNumeric(8)}@test.com`;
  const adminData = {
    email: adminEmail,
    password: "AdminPassword123!",
    username: `admin_${RandomGenerator.alphaNumeric(8)}`,
    name: "Test Administrator",
    href: "http://localhost:3000/admin",
    referrer: "http://localhost:3000",
  } satisfies ICommunityPlatformAdministrator.ICreate;

  const admin: ICommunityPlatformAdministrator.IAuthorized =
    await api.functional.auth.administrator.join(connection, {
      body: adminData,
    });
  typia.assert(admin);

  // Switch to admin connection to create category
  const adminConnection: api.IConnection = {
    ...connection,
    headers: {
      ...connection.headers,
      Authorization: `Bearer ${admin.token.access}`,
    },
  };

  // Create a category for the community
  const categoryData = {
    name: "Technology",
    slug: `tech_${RandomGenerator.alphaNumeric(6)}`,
    description: "Technology and innovation discussions",
    display_order: 1,
  } satisfies ICommunityPlatformCategory.ICreate;

  const category: ICommunityPlatformCategory =
    await api.functional.communityPlatform.administrator.categories.create(
      adminConnection,
      {
        body: categoryData,
      },
    );
  typia.assert(category);

  // Step 2: Create and authenticate a member
  const memberEmail = `member_${RandomGenerator.alphaNumeric(8)}@test.com`;
  const memberData = {
    email: memberEmail,
    username: `member_${RandomGenerator.alphaNumeric(8)}`,
    password: "MemberPassword123!",
    href: "http://localhost:3000/register",
    referrer: "http://localhost:3000",
  } satisfies ICommunityPlatformMember.ICreate;

  const member: ICommunityPlatformMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: memberData,
    });
  typia.assert(member);

  // Switch to member connection for community creation
  const memberConnection: api.IConnection = {
    ...connection,
    headers: {
      ...connection.headers,
      Authorization: `Bearer ${member.token.access}`,
    },
  };

  // Step 3: Create a community
  const communityData = {
    name: RandomGenerator.paragraph({ sentences: 2 }),
    identifier: `comm_${RandomGenerator.alphaNumeric(8)}`,
    description: RandomGenerator.paragraph({ sentences: 4 }),
    visibility: "public",
    post_creation_restriction: "open_to_all",
    post_type_restriction: "all_types",
    category_slug: category.slug,
  } satisfies ICommunityPlatformCommunity.ICreate;

  const community: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.member.communities.create(
      memberConnection,
      {
        body: communityData,
      },
    );
  typia.assert(community);

  // Step 4: Verify subscriber initialization
  TestValidator.equals(
    "community subscriber_count should be 1 (creator auto-subscribed)",
    community.subscriber_count,
    1,
  );

  TestValidator.equals(
    "community creator ID should match authenticated member ID",
    community.creator.id,
    member.id,
  );

  TestValidator.equals(
    "community category slug should match requested category",
    community.category.slug,
    category.slug,
  );

  TestValidator.predicate(
    "community should have valid created_at timestamp",
    () => new Date(community.created_at) instanceof Date,
  );

  TestValidator.equals(
    "community post_count should be 0 initially",
    community.post_count,
    0,
  );

  TestValidator.equals(
    "community comment_count should be 0 initially",
    community.comment_count,
    0,
  );
}
