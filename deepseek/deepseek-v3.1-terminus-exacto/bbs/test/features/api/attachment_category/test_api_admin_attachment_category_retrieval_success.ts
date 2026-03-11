import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardAttachmentCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAttachmentCategory";
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
 * Test successful retrieval of an active attachment category with complete metadata.
 *
 * This test validates that administrators can retrieve detailed information about
 * attachment categories. Since no category creation endpoint is available in the
 * provided API, this test focuses on validating the response structure and data
 * integrity for existing categories in the system.
 */
export async function test_api_admin_attachment_category_retrieval_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create admin connection and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IDiscussionBoardAdmin.IJoin,
  });
  // 2. Since no category creation endpoint is available, we need to use an existing
  // category ID. In a real scenario, this would come from a previously created category.
  // For this test, we'll use a valid UUID format and let the endpoint handle validation.
  const categoryId = typia.random<string & tags.Format<"uuid">>();
  // 3. Retrieve the attachment category using admin credentials
  const category =
    await api.functional.discussionBoard.admin.attachment_categories.at(
      adminConnection,
      {
        categoryId,
      },
    );
  // 4. Validate the complete response structure using typia.assert
  // This performs comprehensive validation including all type checks,
  // format validations, and constraint validations
  typia.assert(category);
  // 5. The typia.assert() call above validates everything including:
  // - All property existence and types
  // - UUID format for category.id
  // - String format for category.name
  // - Integer type for category.orderIndex
  // - Boolean type for category.isActive
  // - Date-time format for createdAt/updatedAt/deletedAt
  // - Optional description field handling
  // - Parent relationship structure if present
  // No additional manual validation is needed after typia.assert()
  // as it provides complete runtime type validation
}
