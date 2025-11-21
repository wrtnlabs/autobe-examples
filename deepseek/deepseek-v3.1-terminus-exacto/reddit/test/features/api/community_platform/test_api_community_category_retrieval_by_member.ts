import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAuthorizationToken";
import type { ICommunityPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCategory";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunityCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityCategory";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";

/**
 * Test the complete workflow for retrieving a specific category within a
 * community. A member creates a new community, an administrator creates a
 * platform category, and then the member retrieves the category details.
 * Validates that category information is properly associated with communities
 * and accessible to authorized users with proper authentication.
 */
export async function test_api_community_category_retrieval_by_member(
  connection: api.IConnection,
) {
  // Step 1: Create and authenticate as a member
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberPassword = "memberPassword123";

  const member = await api.functional.auth.member.join(connection, {
    body: {
      email: memberEmail,
      password: memberPassword,
      display_name: RandomGenerator.name(),
      href: "https://example.com/register",
      referrer: "https://example.com",
    } satisfies ICommunityPlatformMember.ICreate,
  });
  typia.assert(member);

  // Step 2: Create a community as the authenticated member
  const community =
    await api.functional.communityPlatform.member.communities.create(
      connection,
      {
        body: {
          name: RandomGenerator.paragraph({ sentences: 3 }),
          slug: RandomGenerator.alphabets(10),
          description: RandomGenerator.content({ paragraphs: 2 }),
          privacy: "public",
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);

  // Step 3: Create and authenticate as an administrator
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = "adminPassword123";

  const admin = await api.functional.auth.admin.join(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      display_name: RandomGenerator.name(),
      admin_level: "system",
      is_super_admin: true,
    } satisfies ICommunityPlatformAdmin.ICreate,
  });
  typia.assert(admin);

  // Step 4: Create a platform category as the administrator
  const categoryName = RandomGenerator.alphabets(8);
  const categoryDisplayName = RandomGenerator.name();

  const category =
    await api.functional.communityPlatform.admin.categories.create(connection, {
      body: {
        name: categoryName,
        display_name: categoryDisplayName,
        description: RandomGenerator.content({ paragraphs: 3 }),
        sort_order: typia.random<
          number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<100>
        >(),
        is_active: true,
        status: "active",
      } satisfies ICommunityPlatformCategory.ICreate,
    });
  typia.assert(category);

  // Step 5: Switch back to member authentication
  await api.functional.auth.member.login(connection, {
    body: {
      email: memberEmail,
      password: memberPassword,
      href: "https://example.com/login",
      referrer: "https://example.com",
    } satisfies ICommunityPlatformMember.ILogin,
  });

  // Step 6: Retrieve the category details as the member
  const retrievedCategory =
    await api.functional.communityPlatform.communities.categories.getByCommunityslugAndCategoryname(
      connection,
      {
        communitySlug: community.slug,
        categoryName: category.name,
      },
    );
  typia.assert(retrievedCategory);

  // Step 7: Validate the retrieved category matches the created category
  TestValidator.equals(
    "category ID matches",
    retrievedCategory.id,
    category.id,
  );
  TestValidator.equals(
    "category name matches",
    retrievedCategory.name,
    category.name,
  );
  TestValidator.equals(
    "category display name matches",
    retrievedCategory.display_name,
    category.display_name,
  );
  TestValidator.equals(
    "category description matches",
    retrievedCategory.description,
    category.description,
  );
  TestValidator.equals(
    "category sort order matches",
    retrievedCategory.sort_order,
    category.sort_order,
  );
  TestValidator.equals(
    "category active status matches",
    retrievedCategory.is_active,
    category.is_active,
  );
  TestValidator.equals(
    "category status matches",
    retrievedCategory.status,
    category.status,
  );

  // Step 8: Validate category metadata integrity
  TestValidator.predicate(
    "category has valid created_at timestamp",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(retrievedCategory.created_at),
  );
  TestValidator.predicate(
    "category has valid updated_at timestamp",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(retrievedCategory.updated_at),
  );

  // Step 9: Validate category creator information
  TestValidator.equals(
    "category created_by admin ID matches",
    retrievedCategory.created_by.id,
    admin.id,
  );
  TestValidator.equals(
    "category created_by admin display name matches",
    retrievedCategory.created_by.display_name,
    admin.display_name,
  );
  TestValidator.equals(
    "category created_by admin level matches",
    retrievedCategory.created_by.admin_level,
    admin.admin_level,
  );
}
