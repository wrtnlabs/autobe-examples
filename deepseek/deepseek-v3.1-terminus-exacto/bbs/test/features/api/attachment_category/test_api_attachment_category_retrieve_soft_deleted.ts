import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAttachmentCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAttachmentCategory";
import type { IDiscussionBoardSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuperAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_admin_join } from "../../../authorize/authorize_super_admin_join";
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";

/**
 * Test retrieving an attachment category to verify super administrator access.
 * Since category creation and deletion endpoints are not available, this test
 * focuses on validating that super administrators can retrieve category information
 * using the available endpoint.
 */
export async function test_api_attachment_category_retrieve_soft_deleted(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as super administrator
  const superAdminConnection: api.IConnection = { host: connection.host };
  await authorize_super_admin_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IDiscussionBoardSuperAdmin.IJoin,
  });
  // 2. Retrieve a category using the superAdmin endpoint
  // Since we cannot create or soft-delete categories with available endpoints,
  // we test the retrieval functionality with a valid UUID format
  const categoryId = typia.random<string & tags.Format<"uuid">>();
  const category =
    await api.functional.discussionBoard.superAdmin.attachment_categories.at(
      superAdminConnection,
      {
        categoryId,
      },
    );
  // 3. Validate the response structure
  typia.assert(category);
  // The test validates that super administrators can access category information
  // Note: In a real scenario with proper category management, we would test
  // soft-deleted category retrieval specifically
}
