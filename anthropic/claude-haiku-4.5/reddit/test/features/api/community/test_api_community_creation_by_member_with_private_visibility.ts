import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdministrator";
import type { ICommunityPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCategory";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";

/**
 * Test creation of a private community by an authenticated member.
 *
 * Validates that:
 *
 * 1. A member can create a private community with restricted visibility
 * 2. Private community is created with subscriber_count = 1 (creator
 *    auto-subscribed)
 * 3. Community metrics are properly initialized (post_count = 0, comment_count =
 *    0)
 * 4. Community has proper visibility set to 'private'
 * 5. Community is assigned to a valid category
 * 6. All required community fields are populated correctly
 *
 * Setup:
 *
 * 1. Create an administrator account to set up the category
 * 2. Create a category for community classification
 * 3. Create a member account for community creation
 * 4. Authenticate the member
 * 5. Create a private community with all required parameters
 * 6. Validate the response contains correct private community configuration
 */
export async function test_api_community_creation_by_member_with_private_visibility(
  connection: api.IConnection,
) {
  // Step 1: Create administrator account for category setup
  const adminData = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    username: RandomGenerator.alphaNumeric(10),
    name: RandomGenerator.name(),
    href: "http://localhost:3000/auth/admin",
    referrer: "http://localhost:3000",
  };
  const admin = await api.functional.auth.administrator.join(connection, {
    body: adminData satisfies ICommunityPlatformAdministrator.ICreate,
  });
  typia.assert(admin);

  // Step 2: Create a category for the private community
  const categoryData = {
    name: RandomGenerator.paragraph({ sentences: 2 }),
    slug: RandomGenerator.alphaNumeric(8),
    description: RandomGenerator.paragraph({ sentences: 3 }),
    icon_url: "https://example.com/icon.png",
    display_order: 1,
  };
  const category =
    await api.functional.communityPlatform.administrator.categories.create(
      connection,
      {
        body: categoryData satisfies ICommunityPlatformCategory.ICreate,
      },
    );
  typia.assert(category);

  // Step 3: Create member account for community creation
  const memberData = {
    email: typia.random<string & tags.Format<"email">>(),
    username: RandomGenerator.alphaNumeric(10),
    password: RandomGenerator.alphaNumeric(12),
    href: "http://localhost:3000/auth/member",
    referrer: "http://localhost:3000",
  };
  const member = await api.functional.auth.member.join(connection, {
    body: memberData satisfies ICommunityPlatformMember.ICreate,
  });
  typia.assert(member);

  // Step 4: Authenticate as member
  const memberLogin = await api.functional.auth.member.login(connection, {
    body: {
      email: memberData.email,
      password: memberData.password,
      href: "http://localhost:3000/member/dashboard",
      referrer: "http://localhost:3000",
    } satisfies ICommunityPlatformMember.ILogin,
  });
  typia.assert(memberLogin);

  // Step 5: Create a private community
  const privateCommunityData = {
    name: RandomGenerator.paragraph({ sentences: 2 }),
    identifier: RandomGenerator.alphaNumeric(12),
    description: RandomGenerator.paragraph({ sentences: 4 }),
    visibility: "private" as const,
    post_creation_restriction: "open_to_all" as const,
    post_type_restriction: "all_types" as const,
    category_slug: category.slug,
  };
  const privateCommunity =
    await api.functional.communityPlatform.member.communities.create(
      connection,
      {
        body: privateCommunityData satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(privateCommunity);

  // Step 6: Validate private community creation response
  TestValidator.equals(
    "community visibility should be private",
    privateCommunity.visibility,
    "private",
  );

  TestValidator.equals(
    "community identifier should match request",
    privateCommunity.identifier,
    privateCommunityData.identifier,
  );

  TestValidator.equals(
    "community name should match request",
    privateCommunity.name,
    privateCommunityData.name,
  );

  TestValidator.equals(
    "community description should match request",
    privateCommunity.description,
    privateCommunityData.description,
  );

  TestValidator.equals(
    "community post_creation_restriction should match request",
    privateCommunity.post_creation_restriction,
    privateCommunityData.post_creation_restriction,
  );

  TestValidator.equals(
    "community post_type_restriction should match request",
    privateCommunity.post_type_restriction,
    privateCommunityData.post_type_restriction,
  );

  // Step 7: Validate community initialization metrics
  TestValidator.equals(
    "community subscriber_count should be 1 (creator auto-subscribed)",
    privateCommunity.subscriber_count,
    1,
  );

  TestValidator.equals(
    "community post_count should be initialized to 0",
    privateCommunity.post_count,
    0,
  );

  TestValidator.equals(
    "community comment_count should be initialized to 0",
    privateCommunity.comment_count,
    0,
  );

  // Step 8: Validate category assignment
  TestValidator.equals(
    "community category slug should match assigned category",
    privateCommunity.category.slug,
    category.slug,
  );

  TestValidator.equals(
    "community category id should match assigned category",
    privateCommunity.category.id,
    category.id,
  );

  // Step 9: Validate creator assignment
  TestValidator.equals(
    "community creator id should match authenticated member",
    privateCommunity.creator.id,
    memberLogin.id,
  );

  TestValidator.equals(
    "community creator username should match member username",
    privateCommunity.creator.username,
    memberData.username,
  );

  // Step 10: Validate timestamps exist
  TestValidator.predicate(
    "community created_at timestamp should exist",
    () =>
      privateCommunity.created_at !== null &&
      privateCommunity.created_at !== undefined,
  );

  TestValidator.predicate(
    "community updated_at timestamp should exist",
    () =>
      privateCommunity.updated_at !== null &&
      privateCommunity.updated_at !== undefined,
  );

  TestValidator.predicate(
    "community deleted_at should be null for active community",
    () =>
      privateCommunity.deleted_at === null ||
      privateCommunity.deleted_at === undefined,
  );
}
