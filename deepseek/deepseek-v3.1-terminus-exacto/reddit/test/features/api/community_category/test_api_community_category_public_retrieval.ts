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
 * Test that community categories can be retrieved publicly after being created
 * by administrators. Validates that category information including display
 * name, description, icon URL, color settings, and status is accessible without
 * authentication while ensuring proper data visibility and community-category
 * association integrity.
 */
export async function test_api_community_category_public_retrieval(
  connection: api.IConnection,
) {
  // Step 1: Create administrator account for category management
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = typia.random<string & tags.Format<"password">>();

  const admin: ICommunityPlatformAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password: adminPassword,
        display_name: RandomGenerator.name(),
        admin_level: "system",
        is_super_admin: true,
      } satisfies ICommunityPlatformAdmin.ICreate,
    });
  typia.assert(admin);

  // Step 2: Create category using administrator privileges
  const categoryData = {
    name: RandomGenerator.alphabets(10),
    display_name: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.content({ paragraphs: 2 }),
    icon_url: "https://example.com/icon.png",
    color_hex: "#FF5733",
    sort_order: typia.random<number & tags.Type<"int32"> & tags.Minimum<1>>(),
    is_active: true,
    status: "active",
  } satisfies ICommunityPlatformCategory.ICreate;

  const category: ICommunityPlatformCategory =
    await api.functional.communityPlatform.admin.categories.create(connection, {
      body: categoryData,
    });
  typia.assert(category);

  // Step 3: Switch to member authentication for community creation
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberPassword = typia.random<string & tags.MinLength<8>>();

  const member: ICommunityPlatformMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: memberEmail,
        password: memberPassword,
        display_name: RandomGenerator.name(),
        href: "https://example.com/register",
        referrer: "https://example.com",
      } satisfies ICommunityPlatformMember.ICreate,
    });
  typia.assert(member);

  // Step 4: Create community with the newly created category
  const communityData = {
    name: RandomGenerator.alphabets(15),
    slug: RandomGenerator.alphabets(12),
    description: RandomGenerator.content({ paragraphs: 3 }),
    privacy: "public",
    category: {
      id: category.id,
      name: category.name,
      display_name: category.display_name,
      slug: category.name,
      description: category.description,
      icon_url: category.icon_url,
      color_hex: category.color_hex,
      sort_order: category.sort_order,
      is_active: category.is_active,
      status: category.status,
      created_at: category.created_at,
      updated_at: category.updated_at,
    } satisfies ICommunityPlatformCommunityCategory.ISummary,
  } satisfies ICommunityPlatformCommunity.ICreate;

  const community: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.member.communities.create(
      connection,
      {
        body: communityData,
      },
    );
  typia.assert(community);

  // Step 5: Create unauthenticated connection for public retrieval
  const unauthConn: api.IConnection = { ...connection, headers: {} };

  // Step 6: Retrieve category publicly without authentication
  const publicCategory: ICommunityPlatformCategory =
    await api.functional.communityPlatform.communities.categories.getByCommunityslugAndCategoryslug(
      unauthConn,
      {
        communitySlug: community.slug,
        categorySlug: category.name,
      },
    );
  typia.assert(publicCategory);

  // Step 7: Validate that publicly retrieved category matches created category
  TestValidator.equals("category ID matches", publicCategory.id, category.id);
  TestValidator.equals(
    "category name matches",
    publicCategory.name,
    category.name,
  );
  TestValidator.equals(
    "display name matches",
    publicCategory.display_name,
    category.display_name,
  );
  TestValidator.equals(
    "description matches",
    publicCategory.description,
    category.description,
  );
  TestValidator.equals(
    "icon URL matches",
    publicCategory.icon_url,
    category.icon_url,
  );
  TestValidator.equals(
    "color hex matches",
    publicCategory.color_hex,
    category.color_hex,
  );
  TestValidator.equals(
    "sort order matches",
    publicCategory.sort_order,
    category.sort_order,
  );
  TestValidator.equals(
    "active status matches",
    publicCategory.is_active,
    category.is_active,
  );
  TestValidator.equals(
    "workflow status matches",
    publicCategory.status,
    category.status,
  );

  // Validate category-community association
  TestValidator.equals(
    "community slug matches input",
    community.slug,
    communityData.slug,
  );
  TestValidator.equals(
    "category name matches input",
    category.name,
    categoryData.name,
  );

  console.log("✅ Public category retrieval test completed successfully");
}
