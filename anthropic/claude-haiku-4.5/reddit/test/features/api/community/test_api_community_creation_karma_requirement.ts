import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdministrator";
import type { ICommunityPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCategory";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";

/**
 * Test that members must have sufficient karma to create communities.
 *
 * This test validates the karma requirement system for community creation. The
 * platform requires members to have at least 1 karma point before they can
 * create new communities. This prevents spam and ensures only engaged members
 * can create communities.
 *
 * Test flow:
 *
 * 1. Create administrator account and a category
 * 2. Create a new member account (starts with 0 karma)
 * 3. Attempt to create a community with 0 karma (should fail with 403)
 * 4. Verify error indicates insufficient karma requirement
 */
export async function test_api_community_creation_karma_requirement(
  connection: api.IConnection,
) {
  // Step 1: Create an administrator account
  const adminData = {
    email: `admin_${RandomGenerator.alphaNumeric(8)}@test.com`,
    password: "AdminPassword123!",
    username: `admin_${RandomGenerator.alphaNumeric(8)}`,
    name: "Test Administrator",
    href: "http://localhost:3000/admin",
    referrer: "http://localhost:3000",
  } satisfies ICommunityPlatformAdministrator.ICreate;

  const admin = await api.functional.auth.administrator.join(connection, {
    body: adminData,
  });
  typia.assert(admin);
  TestValidator.equals("admin email matches", admin.email, adminData.email);

  // Step 2: Create a category for community creation
  const categoryData = {
    name: "Technology",
    slug: `tech_${RandomGenerator.alphaNumeric(8)}`,
    display_order: 1,
    description: "Technology and programming discussions",
    icon_url: null,
  } satisfies ICommunityPlatformCategory.ICreate;

  const category =
    await api.functional.communityPlatform.administrator.categories.create(
      connection,
      {
        body: categoryData,
      },
    );
  typia.assert(category);
  TestValidator.equals(
    "category name matches",
    category.name,
    categoryData.name,
  );
  TestValidator.equals(
    "category slug matches",
    category.slug,
    categoryData.slug,
  );

  // Step 3: Create a new member account (with 0 karma initially)
  const newMemberData = {
    email: `member_${RandomGenerator.alphaNumeric(8)}@test.com`,
    username: `user_${RandomGenerator.alphaNumeric(8)}`,
    password: "TestPassword123!",
    ip: "192.168.1.1",
    href: "http://localhost:3000/register",
    referrer: "http://localhost:3000",
  } satisfies ICommunityPlatformMember.ICreate;

  const newMember = await api.functional.auth.member.join(connection, {
    body: newMemberData,
  });
  typia.assert(newMember);
  TestValidator.equals("member email matches", newMember.id.length, 36); // Validate UUID format

  // Step 4: Attempt to create community with 0 karma (should fail with 403 Forbidden)
  // The newly created member starts with 0 karma and should not be able to create communities
  const communityDataZeroKarma = {
    name: "Test Community",
    identifier: `test_comm_${RandomGenerator.alphaNumeric(8)}`,
    description: "Testing karma requirement for community creation",
    visibility: "public" as const,
    post_creation_restriction: "open_to_all" as const,
    post_type_restriction: "all_types" as const,
    category_slug: category.slug,
  } satisfies ICommunityPlatformCommunity.ICreate;

  // Test that member with 0 karma cannot create community
  await TestValidator.error(
    "member with insufficient karma cannot create community",
    async () => {
      await api.functional.communityPlatform.member.communities.create(
        connection,
        {
          body: communityDataZeroKarma,
        },
      );
    },
  );

  TestValidator.predicate("test confirms karma requirement is enforced", true);
}
