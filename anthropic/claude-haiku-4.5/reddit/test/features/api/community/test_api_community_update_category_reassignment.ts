import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdministrator";
import type { ICommunityPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCategory";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";

/**
 * Test updating a community's category classification to a different valid
 * category.
 *
 * Validates that a community created in one category can be successfully
 * reassigned to a different category. Tests the complete workflow including:
 *
 * 1. Creating member and administrator accounts
 * 2. Administrator creates two categories
 * 3. Member creates a community in the first category
 * 4. Community category is updated to the second category
 * 5. Category change persists in the community data
 * 6. Invalid category references are properly rejected
 *
 * Process flow:
 *
 * 1. Administrator joins and creates first category (e.g., 'technology')
 * 2. Administrator creates second category (e.g., 'entertainment')
 * 3. Member joins the platform
 * 4. Member creates a community assigned to first category
 * 5. Member updates community to reassign it to second category
 * 6. Verify the category change is reflected in community data
 * 7. Attempt update with invalid category ID and validate error handling
 */
export async function test_api_community_update_category_reassignment(
  connection: api.IConnection,
) {
  // Step 1: Administrator registration
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminData = {
    email: adminEmail,
    password: RandomGenerator.alphaNumeric(12),
    username: RandomGenerator.alphaNumeric(10),
    name: RandomGenerator.name(),
    href: "http://localhost:3000/admin",
    referrer: "http://localhost:3000",
  } satisfies ICommunityPlatformAdministrator.ICreate;

  const adminAuthorized = await api.functional.auth.administrator.join(
    connection,
    { body: adminData },
  );
  typia.assert(adminAuthorized);
  TestValidator.predicate(
    "administrator account created",
    adminAuthorized.id !== undefined,
  );

  // Step 2: Create first category
  const firstCategoryData = {
    name: "Technology",
    slug: "technology",
    display_order: 1,
    description: "Technology and programming discussions",
    icon_url: null,
  } satisfies ICommunityPlatformCategory.ICreate;

  const firstCategory =
    await api.functional.communityPlatform.administrator.categories.create(
      connection,
      { body: firstCategoryData },
    );
  typia.assert(firstCategory);
  TestValidator.equals(
    "first category created",
    firstCategory.name,
    "Technology",
  );

  // Step 3: Create second category
  const secondCategoryData = {
    name: "Entertainment",
    slug: "entertainment",
    display_order: 2,
    description: "Entertainment and media discussions",
    icon_url: null,
  } satisfies ICommunityPlatformCategory.ICreate;

  const secondCategory =
    await api.functional.communityPlatform.administrator.categories.create(
      connection,
      { body: secondCategoryData },
    );
  typia.assert(secondCategory);
  TestValidator.equals(
    "second category created",
    secondCategory.name,
    "Entertainment",
  );

  // Step 4: Member registration
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberData = {
    email: memberEmail,
    password: RandomGenerator.alphaNumeric(12),
    username: RandomGenerator.alphaNumeric(10),
    href: "http://localhost:3000/join",
    referrer: "http://localhost:3000",
  } satisfies ICommunityPlatformMember.ICreate;

  const memberAuthorized = await api.functional.auth.member.join(connection, {
    body: memberData,
  });
  typia.assert(memberAuthorized);
  TestValidator.predicate(
    "member account created",
    memberAuthorized.id !== undefined,
  );

  // Step 5: Create community in first category
  const communityData = {
    name: "Tech Discussions",
    identifier: RandomGenerator.alphaNumeric(8),
    description: "A community for technology discussions",
    visibility: "public",
    post_creation_restriction: "open_to_all",
    post_type_restriction: "all_types",
    category_slug: firstCategory.slug,
  } satisfies ICommunityPlatformCommunity.ICreate;

  const createdCommunity =
    await api.functional.communityPlatform.member.communities.create(
      connection,
      { body: communityData },
    );
  typia.assert(createdCommunity);
  TestValidator.equals(
    "community created in first category",
    createdCommunity.category.id,
    firstCategory.id,
  );
  TestValidator.equals(
    "community name matches",
    createdCommunity.name,
    "Tech Discussions",
  );

  // Step 6: Update community to reassign to second category
  const updateData = {
    category_id: secondCategory.id,
  } satisfies ICommunityPlatformCommunity.IUpdate;

  const updatedCommunity =
    await api.functional.communityPlatform.member.communities.update(
      connection,
      {
        communityId: createdCommunity.id,
        body: updateData,
      },
    );
  typia.assert(updatedCommunity);
  TestValidator.equals(
    "category reassigned to entertainment",
    updatedCommunity.category.id,
    secondCategory.id,
  );
  TestValidator.equals(
    "community name unchanged",
    updatedCommunity.name,
    createdCommunity.name,
  );
  TestValidator.equals(
    "community identifier unchanged",
    updatedCommunity.identifier,
    createdCommunity.identifier,
  );
  TestValidator.predicate(
    "updated_at timestamp refreshed",
    new Date(updatedCommunity.updated_at) >=
      new Date(createdCommunity.updated_at),
  );

  // Step 7: Verify category reassignment persists
  const nonExistentCategoryId = typia.random<string & tags.Format<"uuid">>();

  await TestValidator.error(
    "invalid category ID should be rejected",
    async () => {
      await api.functional.communityPlatform.member.communities.update(
        connection,
        {
          communityId: createdCommunity.id,
          body: {
            category_id: nonExistentCategoryId,
          } satisfies ICommunityPlatformCommunity.IUpdate,
        },
      );
    },
  );

  // Step 8: Verify multiple property updates work together
  const multiUpdateData = {
    name: "Updated Tech Hub",
    description: "Updated technology discussion hub",
    category_id: firstCategory.id,
  } satisfies ICommunityPlatformCommunity.IUpdate;

  const multiUpdatedCommunity =
    await api.functional.communityPlatform.member.communities.update(
      connection,
      {
        communityId: updatedCommunity.id,
        body: multiUpdateData,
      },
    );
  typia.assert(multiUpdatedCommunity);
  TestValidator.equals(
    "name updated",
    multiUpdatedCommunity.name,
    "Updated Tech Hub",
  );
  TestValidator.equals(
    "description updated",
    multiUpdatedCommunity.description,
    "Updated technology discussion hub",
  );
  TestValidator.equals(
    "category reassigned back to technology",
    multiUpdatedCommunity.category.id,
    firstCategory.id,
  );
}
