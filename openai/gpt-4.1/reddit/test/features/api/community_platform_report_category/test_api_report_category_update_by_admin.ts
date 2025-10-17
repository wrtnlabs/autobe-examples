import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformReportCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReportCategory";

/**
 * Test updating an existing report category by an authenticated admin. The test
 * ensures that:
 *
 * 1. An admin can update the name and allow_free_text flag
 * 2. Changes are reflected in the response
 * 3. Changing to a duplicate name fails validation
 * 4. Non-admin users cannot perform the update
 */
export async function test_api_report_category_update_by_admin(
  connection: api.IConnection,
) {
  // Step 1: Register and login as admin
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const admin = await api.functional.auth.admin.join(connection, {
    body: {
      email: adminEmail,
      password: "A1strong&pass!",
      superuser: true,
    } satisfies ICommunityPlatformAdmin.ICreate,
  });
  typia.assert(admin);

  // Step 2: Create two unique report categories
  const categoryName1 = `spam_${RandomGenerator.alphaNumeric(8)}`;
  const categoryName2 = `harassment_${RandomGenerator.alphaNumeric(8)}`;
  const category1 =
    await api.functional.communityPlatform.admin.reportCategories.create(
      connection,
      {
        body: {
          name: categoryName1,
          allow_free_text: false,
        } satisfies ICommunityPlatformReportCategory.ICreate,
      },
    );
  typia.assert(category1);

  const category2 =
    await api.functional.communityPlatform.admin.reportCategories.create(
      connection,
      {
        body: {
          name: categoryName2,
          allow_free_text: true,
        } satisfies ICommunityPlatformReportCategory.ICreate,
      },
    );
  typia.assert(category2);

  // Step 3: Update category1 (change both name and allow_free_text)
  const updatedName = `updated_${RandomGenerator.alphaNumeric(6)}`;
  const updateResp =
    await api.functional.communityPlatform.admin.reportCategories.update(
      connection,
      {
        reportCategoryId: category1.id,
        body: {
          name: updatedName,
          allow_free_text: true,
        } satisfies ICommunityPlatformReportCategory.IUpdate,
      },
    );
  typia.assert(updateResp);
  TestValidator.equals("updated name applied", updateResp.name, updatedName);
  TestValidator.equals(
    "updated allow_free_text applied",
    updateResp.allow_free_text,
    true,
  );

  // Step 4: Try updating to a duplicate name
  await TestValidator.error("duplicate name rejected", async () => {
    await api.functional.communityPlatform.admin.reportCategories.update(
      connection,
      {
        reportCategoryId: category1.id,
        body: {
          name: category2.name,
        } satisfies ICommunityPlatformReportCategory.IUpdate,
      },
    );
  });

  // Step 5: Try updating as unauthenticated (non-admin) user
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error("non-admin update rejected", async () => {
    await api.functional.communityPlatform.admin.reportCategories.update(
      unauthConn,
      {
        reportCategoryId: category1.id,
        body: {
          name: RandomGenerator.name(),
        } satisfies ICommunityPlatformReportCategory.IUpdate,
      },
    );
  });
}
