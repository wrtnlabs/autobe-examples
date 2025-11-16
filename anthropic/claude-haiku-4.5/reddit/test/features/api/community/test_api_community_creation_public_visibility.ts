import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdministrator";
import type { ICommunityPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCategory";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";

export async function test_api_community_creation_public_visibility(
  connection: api.IConnection,
) {
  // Step 1: Create an administrator to set up the category
  const adminEmail = `admin_${RandomGenerator.alphaNumeric(8)}@test.com`;
  const adminData = {
    email: adminEmail,
    password: "SecurePass123!",
    username: `admin_${RandomGenerator.alphaNumeric(6)}`,
    name: `Admin ${RandomGenerator.name()}`,
    href: "http://localhost:3000/admin/register",
    referrer: "http://localhost:3000/admin",
  } satisfies ICommunityPlatformAdministrator.ICreate;

  const adminAuth = await api.functional.auth.administrator.join(connection, {
    body: adminData,
  });
  typia.assert(adminAuth);

  // Step 2: Create a category for the community
  const categoryData = {
    name: "Technology",
    slug: `tech_${RandomGenerator.alphaNumeric(6)}`,
    description: "Technology and software discussions",
    display_order: 1,
  } satisfies ICommunityPlatformCategory.ICreate;

  const category =
    await api.functional.communityPlatform.administrator.categories.create(
      connection,
      { body: categoryData },
    );
  typia.assert(category);
  TestValidator.equals(
    "category created successfully",
    category.name,
    "Technology",
  );

  // Step 3: Create a member to be the community creator
  const memberEmail = `member_${RandomGenerator.alphaNumeric(8)}@test.com`;
  const memberData = {
    email: memberEmail,
    username: `member_${RandomGenerator.alphaNumeric(6)}`,
    password: "SecurePass123!",
    href: "http://localhost:3000/register",
    referrer: "http://localhost:3000",
  } satisfies ICommunityPlatformMember.ICreate;

  const memberAuth = await api.functional.auth.member.join(connection, {
    body: memberData,
  });
  typia.assert(memberAuth);

  // Step 4: Create a public community
  const communityData = {
    name: `Public Community ${RandomGenerator.alphaNumeric(6)}`,
    identifier: `public_${RandomGenerator.alphaNumeric(8)}`,
    description: "A public community for testing visibility",
    visibility: "public",
    post_creation_restriction: "open_to_all",
    post_type_restriction: "all_types",
    category_slug: category.slug,
  } satisfies ICommunityPlatformCommunity.ICreate;

  const community =
    await api.functional.communityPlatform.member.communities.create(
      connection,
      { body: communityData },
    );
  typia.assert(community);

  // Step 5: Verify the community was created with public visibility
  TestValidator.equals(
    "community visibility is public",
    community.visibility,
    "public",
  );

  // Step 6: Verify other community properties
  TestValidator.equals(
    "community name matches",
    community.name,
    communityData.name,
  );
  TestValidator.equals(
    "community identifier matches",
    community.identifier,
    communityData.identifier,
  );
  TestValidator.equals(
    "community description matches",
    community.description,
    communityData.description,
  );
  TestValidator.equals(
    "community post creation restriction matches",
    community.post_creation_restriction,
    "open_to_all",
  );
  TestValidator.equals(
    "community post type restriction matches",
    community.post_type_restriction,
    "all_types",
  );

  // Step 7: Verify category reference is properly set
  TestValidator.equals(
    "category slug matches",
    community.category.slug,
    category.slug,
  );

  // Step 8: Verify creator information
  TestValidator.equals(
    "creator username matches",
    community.creator.username,
    memberData.username,
  );

  // Step 9: Verify initial counts
  TestValidator.predicate(
    "subscriber count should be at least 1 (creator auto-subscribed)",
    community.subscriber_count >= 1,
  );
  TestValidator.equals(
    "initial post count should be 0",
    community.post_count,
    0,
  );
  TestValidator.equals(
    "initial comment count should be 0",
    community.comment_count,
    0,
  );

  // Step 10: Verify timestamps are set
  TestValidator.predicate(
    "created_at should be set",
    community.created_at !== null && community.created_at !== undefined,
  );
  TestValidator.predicate(
    "updated_at should be set",
    community.updated_at !== null && community.updated_at !== undefined,
  );
}
