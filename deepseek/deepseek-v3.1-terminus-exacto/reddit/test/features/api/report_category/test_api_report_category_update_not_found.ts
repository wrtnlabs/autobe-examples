import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformReportCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReportCategory";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

/**
 * Test the business scenario where an admin attempts to update a report category that doesn't exist or has been soft-deleted.
 * Authenticate as admin, create a valid UUID that doesn't correspond to any report category, and attempt to update it.
 * Verify the system returns a 404 not found error. This validates the business requirement that administrators can only
 * modify existing, active report categories. The system should check both existence and soft-delete status (deleted_at is null)
 * before allowing updates. This is a business logic failure scenario testing proper resource lifecycle management.
 */
export async function test_api_report_category_update_not_found(
  connection: api.IConnection,
): Promise<void> {
  // Create admin connection and authenticate using utility function
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_admin_join(adminConnection, {
    body: {
      email: "admin-test@example.com",
      password: "testpassword123",
      display_name: "Test Admin",
      permissions_level: null,
    } satisfies ICommunityPlatformAdmin.IJoin,
  });
  typia.assert(adminAuth);
  // Update admin connection with authorization token
  adminConnection.headers = {
    Authorization: adminAuth.token.access,
  };
  // Generate a valid UUID that doesn't correspond to any existing report category
  const nonExistentReportCategoryId = "00000000-0000-0000-0000-000000000000";
  // Create valid update data
  const updateBody: ICommunityPlatformReportCategory.IUpdate = {
    name: "test_category_name",
    display_name: "Test Category Display Name",
    description:
      "This is a test description for a non-existent report category",
    severity_level: "medium",
    moderation_guidelines: "Test moderation guidelines for the category",
    is_active: true,
  } satisfies ICommunityPlatformReportCategory.IUpdate;
  // Attempt to update non-existent report category and verify 404 error
  await TestValidator.error(
    "update non-existent report category should return 404",
    async () => {
      await api.functional.communityPlatform.admin.report_categories.update(
        adminConnection,
        {
          reportCategoryId: nonExistentReportCategoryId,
          body: updateBody,
        },
      );
    },
  );
}
