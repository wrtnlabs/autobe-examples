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
 * Test complete community category lifecycle from creation to update by
 * administrator. Admin creates category, member creates community, then admin
 * updates category properties including display name, description, icon URL,
 * color settings, and status. Validates role-based access control, proper
 * community-category association, and update workflow integrity.
 */
export async function test_api_community_category_update_by_admin(
  connection: api.IConnection,
) {
  // Step 1: Admin authentication and category creation
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = "AdminPassword123!";

  const admin: ICommunityPlatformAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password: adminPassword,
        display_name: RandomGenerator.name(),
        admin_level: "content",
        is_super_admin: false,
      } satisfies ICommunityPlatformAdmin.ICreate,
    });
  typia.assert(admin);

  // Step 2: Create initial category
  const initialCategoryData = {
    name: RandomGenerator.alphabets(10),
    display_name: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.content({ paragraphs: 1 }),
    icon_url: typia.random<string & tags.Format<"uri">>(),
    color_hex: "#FF5733",
    sort_order: typia.random<
      number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<100>
    >(),
    is_active: true,
    status: "active",
  } satisfies ICommunityPlatformCategory.ICreate;

  const initialCategory: ICommunityPlatformCategory =
    await api.functional.communityPlatform.admin.categories.create(connection, {
      body: initialCategoryData,
    });
  typia.assert(initialCategory);

  // Step 3: Member authentication and community creation
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberPassword = "MemberPassword123!";

  const member: ICommunityPlatformMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: memberEmail,
        password: memberPassword,
        display_name: RandomGenerator.name(),
        ip: "192.168.1.1",
        href: "https://example.com/register",
        referrer: "https://example.com",
      } satisfies ICommunityPlatformMember.ICreate,
    });
  typia.assert(member);

  // Create community
  const communityData = {
    name: RandomGenerator.alphabets(15),
    slug: RandomGenerator.alphabets(12),
    description: RandomGenerator.content({ paragraphs: 2 }),
    privacy: "public",
  } satisfies ICommunityPlatformCommunity.ICreate;

  const community: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.member.communities.create(
      connection,
      {
        body: communityData,
      },
    );
  typia.assert(community);

  // Step 4: Switch back to admin and update category
  await api.functional.auth.admin.login(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      ip: "192.168.1.1",
      href: "https://example.com/admin",
      referrer: "https://example.com",
      session_id: typia.random<string>(),
      user_agent: "Mozilla/5.0",
    } satisfies ICommunityPlatformAdmin.ILogin,
  });

  // Step 5: Update category with new properties
  const updatedCategoryData = {
    name: RandomGenerator.alphabets(10),
    display_name: RandomGenerator.paragraph({ sentences: 4 }),
    description: RandomGenerator.content({ paragraphs: 2 }),
    icon_url: typia.random<string & tags.Format<"uri">>(),
    color_hex: "#33FF57",
    sort_order: typia.random<
      number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<100>
    >(),
    is_active: false,
    status: "archived",
  } satisfies ICommunityPlatformCategory.IUpdate;

  const updatedCategory: ICommunityPlatformCategory =
    await api.functional.communityPlatform.admin.communities.categories.putByCommunityslugAndCategoryslug(
      connection,
      {
        communitySlug: community.slug,
        categorySlug: initialCategory.name,
        body: updatedCategoryData,
      },
    );
  typia.assert(updatedCategory);

  // Step 6: Validate category updates
  TestValidator.equals(
    "category ID should remain unchanged",
    updatedCategory.id,
    initialCategory.id,
  );
  TestValidator.notEquals(
    "category name should be updated",
    updatedCategory.name,
    initialCategory.name,
  );
  TestValidator.notEquals(
    "display name should be updated",
    updatedCategory.display_name,
    initialCategory.display_name,
  );
  TestValidator.notEquals(
    "description should be updated",
    updatedCategory.description,
    initialCategory.description,
  );
  TestValidator.notEquals(
    "sort order should be updated",
    updatedCategory.sort_order,
    initialCategory.sort_order,
  );
  TestValidator.notEquals(
    "active status should be updated",
    updatedCategory.is_active,
    initialCategory.is_active,
  );
  TestValidator.notEquals(
    "status should be updated",
    updatedCategory.status,
    initialCategory.status,
  );

  // Step 7: Validate business logic constraints
  TestValidator.predicate(
    "updated category should have valid properties",
    updatedCategory.name.length > 0 &&
      updatedCategory.display_name.length > 0 &&
      updatedCategory.description.length > 0,
  );
}
