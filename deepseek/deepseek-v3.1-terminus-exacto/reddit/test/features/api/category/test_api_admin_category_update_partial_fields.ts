import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAuthorizationToken";
import type { ICommunityPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCategory";

/**
 * Test partial category update scenario where an administrator modifies only
 * specific fields while leaving others unchanged. Validates that the update
 * operation supports selective field modification without requiring complete
 * category reconfiguration.
 */
export async function test_api_admin_category_update_partial_fields(
  connection: api.IConnection,
) {
  // Step 1: Authenticate as administrator
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = "SecurePass123";

  const admin: ICommunityPlatformAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password: adminPassword,
        display_name: RandomGenerator.name(),
        admin_level: "system",
        is_super_admin: false,
      } satisfies ICommunityPlatformAdmin.ICreate,
    });
  typia.assert(admin);

  // Step 2: Create base category with complete configuration
  const baseCategoryData = {
    name: RandomGenerator.alphabets(10).toLowerCase(),
    display_name: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.content({ paragraphs: 2 }),
    icon_url: typia.random<string & tags.Format<"uri">>(),
    color_hex: "#FF5733",
    sort_order: typia.random<
      number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<1000>
    >(),
    is_active: true,
    status: "active",
  } satisfies ICommunityPlatformCategory.ICreate;

  const baseCategory: ICommunityPlatformCategory =
    await api.functional.communityPlatform.admin.categories.create(connection, {
      body: baseCategoryData,
    });
  typia.assert(baseCategory);

  // Step 3: Perform partial update - modify only display_name and description
  const partialUpdateData = {
    display_name: "Updated " + RandomGenerator.paragraph({ sentences: 2 }),
    description: "Modified " + RandomGenerator.content({ paragraphs: 1 }),
  } satisfies ICommunityPlatformCategory.IUpdate;

  const updatedCategory: ICommunityPlatformCategory =
    await api.functional.communityPlatform.admin.categories.update(connection, {
      categoryName: baseCategory.name,
      body: partialUpdateData,
    });
  typia.assert(updatedCategory);

  // Step 4: Validate partial update results
  // Modified fields should have new values
  TestValidator.equals(
    "display_name should be updated",
    updatedCategory.display_name,
    partialUpdateData.display_name,
  );

  TestValidator.equals(
    "description should be updated",
    updatedCategory.description,
    partialUpdateData.description,
  );

  // Unchanged fields should retain original values
  TestValidator.equals(
    "name should remain unchanged",
    updatedCategory.name,
    baseCategory.name,
  );

  TestValidator.equals(
    "icon_url should remain unchanged",
    updatedCategory.icon_url,
    baseCategory.icon_url,
  );

  TestValidator.equals(
    "color_hex should remain unchanged",
    updatedCategory.color_hex,
    baseCategory.color_hex,
  );

  TestValidator.equals(
    "sort_order should remain unchanged",
    updatedCategory.sort_order,
    baseCategory.sort_order,
  );

  TestValidator.equals(
    "is_active should remain unchanged",
    updatedCategory.is_active,
    baseCategory.is_active,
  );

  TestValidator.equals(
    "status should remain unchanged",
    updatedCategory.status,
    baseCategory.status,
  );

  // Step 5: Test another partial update with different field combination
  const secondPartialUpdate = {
    sort_order: typia.random<
      number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<1000>
    >(),
    is_active: false,
    color_hex: "#33FF57",
  } satisfies ICommunityPlatformCategory.IUpdate;

  const finalCategory: ICommunityPlatformCategory =
    await api.functional.communityPlatform.admin.categories.update(connection, {
      categoryName: baseCategory.name,
      body: secondPartialUpdate,
    });
  typia.assert(finalCategory);

  // Validate second partial update
  TestValidator.equals(
    "sort_order should be updated in second update",
    finalCategory.sort_order,
    secondPartialUpdate.sort_order,
  );

  TestValidator.equals(
    "is_active should be updated in second update",
    finalCategory.is_active,
    secondPartialUpdate.is_active,
  );

  TestValidator.equals(
    "color_hex should be updated in second update",
    finalCategory.color_hex,
    secondPartialUpdate.color_hex,
  );

  // Fields from first update should remain unchanged
  TestValidator.equals(
    "display_name from first update should persist",
    finalCategory.display_name,
    partialUpdateData.display_name,
  );

  TestValidator.equals(
    "description from first update should persist",
    finalCategory.description,
    partialUpdateData.description,
  );

  // Original fields should remain unchanged
  TestValidator.equals(
    "name should remain unchanged through all updates",
    finalCategory.name,
    baseCategory.name,
  );
}
