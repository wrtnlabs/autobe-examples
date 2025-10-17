import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformReportCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReportCategory";

/**
 * Validate admin deleting a report category.
 *
 * 1. Register an admin account (unique email, password, optionally superuser)
 * 2. Admin creates a new report category (unique name, allow_free_text)
 * 3. Admin deletes the created category by id
 * 4. Ensure deletion is successful (no error)
 * 5. Try deleting again (expect error: non-existent)
 * 6. Try deleting a random (non-existent) UUID (expect error)
 */
export async function test_api_report_category_deletion_by_admin(
  connection: api.IConnection,
) {
  // 1. Register admin
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const admin = await api.functional.auth.admin.join(connection, {
    body: {
      email: adminEmail,
      password: "StrongP@ssword123",
    } satisfies ICommunityPlatformAdmin.ICreate,
  });
  typia.assert(admin);

  // 2. Create report category
  const categoryName = RandomGenerator.paragraph({ sentences: 2 });
  const reportCategory =
    await api.functional.communityPlatform.admin.reportCategories.create(
      connection,
      {
        body: {
          name: categoryName,
          allow_free_text: RandomGenerator.pick([true, false]),
        } satisfies ICommunityPlatformReportCategory.ICreate,
      },
    );
  typia.assert(reportCategory);

  // 3. Delete the report category
  await api.functional.communityPlatform.admin.reportCategories.erase(
    connection,
    {
      reportCategoryId: reportCategory.id,
    },
  );

  // 4. Deleting again should fail
  await TestValidator.error(
    "Deleting already-deleted report category should fail",
    async () => {
      await api.functional.communityPlatform.admin.reportCategories.erase(
        connection,
        {
          reportCategoryId: reportCategory.id,
        },
      );
    },
  );

  // 5. Try deleting a random non-existent category
  const fakeCategoryId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error(
    "Deleting non-existent report category should fail",
    async () => {
      await api.functional.communityPlatform.admin.reportCategories.erase(
        connection,
        {
          reportCategoryId: fakeCategoryId,
        },
      );
    },
  );
}
