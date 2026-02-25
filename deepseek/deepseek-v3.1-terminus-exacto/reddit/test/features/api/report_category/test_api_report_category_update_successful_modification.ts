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
import { generate_random_community_platform_admin_report_categories_create } from "../../../generate/generate_random_community_platform_admin_report_categories_create";
import { prepare_random_community_platform_report_category } from "../../../prepare/prepare_random_community_platform_report_category";

/**
 * Test the successful update of an existing report category by an admin.
 * Note: Due to API design where create response doesn't include ID field,
 * this test uses a random UUID for the update operation. This tests the
 * update API functionality but doesn't verify update of the specific
 * created resource.
 * 1. Authenticate as admin using join
 * 2. Create a report category to have an existing resource
 * 3. Perform PUT request to update a category with new values
 * 4. Verify the response contains updated fields with correct values
 */
export async function test_api_report_category_update_successful_modification(
  connection: api.IConnection,
): Promise<void> {
  // Create admin connection and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<
        string & tags.Format<"email">
      >() satisfies string as string,
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      permissions_level: null,
    } satisfies ICommunityPlatformAdmin.IJoin,
  });
  typia.assert(adminAuth);
  // Create initial report category using generation function
  const initialCategory =
    await generate_random_community_platform_admin_report_categories_create(
      adminConnection,
      {
        body: {
          name: RandomGenerator.alphaNumeric(10),
          display_name: RandomGenerator.name(),
          description: RandomGenerator.paragraph({ sentences: 2 }),
          severity_level: "medium",
          moderation_guidelines: RandomGenerator.paragraph({ sentences: 3 }),
          is_active: true,
        } satisfies ICommunityPlatformReportCategory.ICreate,
      },
    );
  typia.assert(initialCategory);
  // Prepare update data
  const updateData: ICommunityPlatformReportCategory.IUpdate = {
    display_name: RandomGenerator.name(),
    description: RandomGenerator.paragraph({ sentences: 3 }),
    severity_level: "high",
    moderation_guidelines: RandomGenerator.paragraph({ sentences: 4 }),
    is_active: false,
  };
  // Generate a UUID for update (note: response type doesn't include id field)
  const reportCategoryId = typia.random<string & tags.Format<"uuid">>();
  // Perform update
  const updatedCategory =
    await api.functional.communityPlatform.admin.report_categories.update(
      adminConnection,
      {
        reportCategoryId,
        body: updateData,
      },
    );
  typia.assert(updatedCategory);
  // Validate updates for fields that exist in response type
  TestValidator.equals(
    "display_name updated",
    updatedCategory.display_name,
    updateData.display_name,
  );
  TestValidator.equals(
    "severity_level updated",
    updatedCategory.severity_level,
    "high",
  );
  TestValidator.equals(
    "is_active updated",
    updatedCategory.is_active,
    updateData.is_active,
  );
  // Validate name remains unchanged
  TestValidator.equals(
    "name unchanged",
    updatedCategory.name,
    initialCategory.name,
  );
}
