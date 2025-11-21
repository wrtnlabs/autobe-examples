import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAuthorizationToken";
import type { ICommunityPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCategory";

/**
 * Test category status transition workflow where an administrator updates a
 * category through different lifecycle states (draft → active → suspended →
 * archived). Validates that administrators can properly manage category
 * lifecycle states and that each transition follows appropriate business
 * rules.
 */
export async function test_api_admin_category_update_status_transitions(
  connection: api.IConnection,
) {
  // 1. Create administrator account for authentication
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const admin: ICommunityPlatformAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password: "AdminPassword123!",
        display_name: RandomGenerator.name(),
        admin_level: "content",
        is_super_admin: true,
      } satisfies ICommunityPlatformAdmin.ICreate,
    });
  typia.assert(admin);

  // 2. Create initial category with draft status
  const categoryName = RandomGenerator.alphabets(10);
  const initialCategory: ICommunityPlatformCategory =
    await api.functional.communityPlatform.admin.categories.create(connection, {
      body: {
        name: categoryName,
        display_name: RandomGenerator.paragraph({ sentences: 3 }),
        description: RandomGenerator.content({ paragraphs: 2 }),
        icon_url: typia.random<string & tags.Format<"uri">>(),
        color_hex: typia.random<
          string & tags.Pattern<"^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$">
        >(),
        sort_order: typia.random<
          number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<1000>
        >(),
        is_active: false,
        status: "draft",
      } satisfies ICommunityPlatformCategory.ICreate,
    });
  typia.assert(initialCategory);
  TestValidator.equals(
    "initial status should be draft",
    initialCategory.status,
    "draft",
  );

  // 3. Transition from draft to active
  const activeCategory: ICommunityPlatformCategory =
    await api.functional.communityPlatform.admin.categories.update(connection, {
      categoryName: categoryName,
      body: {
        status: "active",
        is_active: true,
      } satisfies ICommunityPlatformCategory.IUpdate,
    });
  typia.assert(activeCategory);
  TestValidator.equals(
    "status should be active after update",
    activeCategory.status,
    "active",
  );
  TestValidator.predicate(
    "category should be active",
    activeCategory.is_active,
  );
  TestValidator.notEquals(
    "updated_at timestamp should change",
    activeCategory.updated_at,
    initialCategory.updated_at,
  );

  // 4. Transition from active to suspended
  const suspendedCategory: ICommunityPlatformCategory =
    await api.functional.communityPlatform.admin.categories.update(connection, {
      categoryName: categoryName,
      body: {
        status: "suspended",
        is_active: false,
      } satisfies ICommunityPlatformCategory.IUpdate,
    });
  typia.assert(suspendedCategory);
  TestValidator.equals(
    "status should be suspended after update",
    suspendedCategory.status,
    "suspended",
  );
  TestValidator.predicate(
    "category should not be active when suspended",
    !suspendedCategory.is_active,
  );
  TestValidator.notEquals(
    "updated_at timestamp should change",
    suspendedCategory.updated_at,
    activeCategory.updated_at,
  );

  // 5. Transition from suspended to archived
  const archivedCategory: ICommunityPlatformCategory =
    await api.functional.communityPlatform.admin.categories.update(connection, {
      categoryName: categoryName,
      body: {
        status: "archived",
        is_active: false,
      } satisfies ICommunityPlatformCategory.IUpdate,
    });
  typia.assert(archivedCategory);
  TestValidator.equals(
    "status should be archived after update",
    archivedCategory.status,
    "archived",
  );
  TestValidator.predicate(
    "category should not be active when archived",
    !archivedCategory.is_active,
  );
  TestValidator.notEquals(
    "updated_at timestamp should change",
    archivedCategory.updated_at,
    suspendedCategory.updated_at,
  );

  // 6. Verify that basic category properties remain consistent through transitions
  TestValidator.equals(
    "category ID should remain consistent",
    archivedCategory.id,
    initialCategory.id,
  );
  TestValidator.equals(
    "category name should remain consistent",
    archivedCategory.name,
    initialCategory.name,
  );
  TestValidator.equals(
    "category display name should remain consistent",
    archivedCategory.display_name,
    initialCategory.display_name,
  );
  TestValidator.equals(
    "category description should remain consistent",
    archivedCategory.description,
    initialCategory.description,
  );
  TestValidator.equals(
    "category sort order should remain consistent",
    archivedCategory.sort_order,
    initialCategory.sort_order,
  );

  // 7. Test invalid status transition (attempt to reactivate archived category)
  await TestValidator.error(
    "should not allow reactivating archived category",
    async () => {
      await api.functional.communityPlatform.admin.categories.update(
        connection,
        {
          categoryName: categoryName,
          body: {
            status: "active",
            is_active: true,
          } satisfies ICommunityPlatformCategory.IUpdate,
        },
      );
    },
  );

  // 8. Test invalid status value
  await TestValidator.error("should reject invalid status value", async () => {
    await api.functional.communityPlatform.admin.categories.update(connection, {
      categoryName: categoryName,
      body: {
        status: "invalid_status",
      } satisfies ICommunityPlatformCategory.IUpdate,
    });
  });
}
