import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdministrator";
import type { ICommunityPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCategory";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";

/**
 * Test administrator reassigning community to a different category.
 *
 * Validates that an administrator can successfully move a community between
 * valid categories and the category reference is updated correctly. Confirms
 * that category changes are reflected in community details and multiple
 * category reassignments can be performed sequentially with all changes
 * properly persisted.
 *
 * Test workflow:
 *
 * 1. Create administrator account
 * 2. Create member account (community creator)
 * 3. Create multiple categories for reassignment testing
 * 4. Create community assigned to initial category
 * 5. Verify community category assignment
 * 6. Reassign community to second category
 * 7. Verify reassignment to second category
 * 8. Reassign community to third category
 * 9. Verify reassignment to third category
 * 10. Confirm all changes are persisted
 */
export async function test_api_community_update_by_administrator_change_category(
  connection: api.IConnection,
) {
  // 1. Create administrator account
  const adminData = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "ValidPassword123!",
    username: RandomGenerator.alphabets(8),
    name: RandomGenerator.name(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies ICommunityPlatformAdministrator.ICreate;

  const admin: ICommunityPlatformAdministrator.IAuthorized =
    await api.functional.auth.administrator.join(connection, {
      body: adminData,
    });
  typia.assert(admin);

  // Switch to administrator context
  await api.functional.auth.administrator.login(connection, {
    body: {
      email: adminData.email,
      password: "ValidPassword123!",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: "",
    } satisfies ICommunityPlatformAdministrator.ILogin,
  });

  // 2. Create member account (community creator)
  const memberData = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "ValidPassword123!",
    username: RandomGenerator.alphabets(8),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies ICommunityPlatformMember.ICreate;

  const member: ICommunityPlatformMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: memberData,
    });
  typia.assert(member);

  // 3. Create multiple categories for reassignment testing
  const categories = await ArrayUtil.asyncRepeat(3, async (index) => {
    const categoryData = {
      name: `Category ${index + 1}`,
      slug: `category-${index + 1}-${RandomGenerator.alphaNumeric(4)}`,
      description: `Test category ${index + 1} for community reassignment`,
      display_order: index,
    } satisfies ICommunityPlatformCategory.ICreate;

    const category: ICommunityPlatformCategory =
      await api.functional.communityPlatform.administrator.categories.create(
        connection,
        {
          body: categoryData,
        },
      );
    typia.assert(category);
    return category;
  });

  TestValidator.predicate("categories created", () => categories.length === 3);

  // Switch back to member context for community creation
  await api.functional.auth.member.login(connection, {
    body: {
      email: memberData.email,
      password: "ValidPassword123!",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: "",
    } satisfies ICommunityPlatformMember.ILogin,
  });

  // 4. Create community assigned to initial category
  const communityData = {
    name: RandomGenerator.paragraph({ sentences: 2 }),
    identifier: `community_${RandomGenerator.alphaNumeric(6)}`,
    description: RandomGenerator.paragraph({ sentences: 3 }),
    visibility: "public" as const,
    post_creation_restriction: "open_to_all" as const,
    post_type_restriction: "all_types" as const,
    category_slug: categories[0].slug,
  } satisfies ICommunityPlatformCommunity.ICreate;

  const community: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.member.communities.create(
      connection,
      {
        body: communityData,
      },
    );
  typia.assert(community);

  // 5. Verify community initially belongs to the correct category
  TestValidator.equals(
    "community initial category matches",
    community.category.id,
    categories[0].id,
  );
  TestValidator.equals(
    "community initial category slug matches",
    community.category.slug,
    categories[0].slug,
  );

  // Switch to administrator context for category reassignment
  await api.functional.auth.administrator.login(connection, {
    body: {
      email: adminData.email,
      password: "ValidPassword123!",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: "",
    } satisfies ICommunityPlatformAdministrator.ILogin,
  });

  // 6. Perform first category reassignment to second category
  const updateData1 = {
    category_id: categories[1].id,
  } satisfies ICommunityPlatformCommunity.IUpdate;

  const updatedCommunity1: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.administrator.communities.update(
      connection,
      {
        communityId: community.id,
        body: updateData1,
      },
    );
  typia.assert(updatedCommunity1);

  // 7. Verify reassignment to second category
  TestValidator.equals(
    "community reassigned to second category",
    updatedCommunity1.category.id,
    categories[1].id,
  );
  TestValidator.equals(
    "community second category slug matches",
    updatedCommunity1.category.slug,
    categories[1].slug,
  );
  TestValidator.notEquals(
    "community category changed from first",
    updatedCommunity1.category.id,
    categories[0].id,
  );

  // 8. Perform second category reassignment to third category
  const updateData2 = {
    category_id: categories[2].id,
  } satisfies ICommunityPlatformCommunity.IUpdate;

  const updatedCommunity2: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.administrator.communities.update(
      connection,
      {
        communityId: community.id,
        body: updateData2,
      },
    );
  typia.assert(updatedCommunity2);

  // 9. Verify reassignment to third category
  TestValidator.equals(
    "community reassigned to third category",
    updatedCommunity2.category.id,
    categories[2].id,
  );
  TestValidator.equals(
    "community third category slug matches",
    updatedCommunity2.category.slug,
    categories[2].slug,
  );
  TestValidator.notEquals(
    "community category changed from second",
    updatedCommunity2.category.id,
    categories[1].id,
  );

  // 10. Confirm all changes are persisted
  TestValidator.predicate(
    "community modifications persisted correctly",
    () =>
      updatedCommunity2.category.id === categories[2].id &&
      updatedCommunity2.id === community.id,
  );
}
