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
 * Test error handling when retrieving a non-existent attachment category.
 * 1. Admin registers and authenticates
 * 2. Generate random UUID that doesn't exist
 * 3. Attempt to retrieve non-existent category
 * 4. Validate 404 Not Found error response
 */
export async function test_api_admin_attachment_category_not_found_error(
  connection: api.IConnection,
): Promise<void> {
  // Create admin-specific connection
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IDiscussionBoardAdmin.IJoin,
  });
  // Generate random UUID that doesn't exist
  const nonExistentCategoryId = typia.random<string & tags.Format<"uuid">>();
  // Attempt to retrieve non-existent category and validate 404 error
  await TestValidator.error(
    "retrieve non-existent attachment category",
    async () => {
      await api.functional.discussionBoard.admin.attachment_categories.at(
        adminConnection,
        {
          categoryId: nonExistentCategoryId,
        },
      );
    },
  );
}
