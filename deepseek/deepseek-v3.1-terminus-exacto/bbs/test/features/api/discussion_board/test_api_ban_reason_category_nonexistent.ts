import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardBanReasonCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardBanReasonCategory";
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
 * Test handling of non-existent ban reason category IDs.
 * Authenticate as superAdmin, then attempt to retrieve a ban reason category
 * using an invalid or non-existent UUID. Validate that the system returns
 * an appropriate error response when the category ID does not exist in the database.
 */
export async function test_api_ban_reason_category_nonexistent(
  connection: api.IConnection,
): Promise<void> {
  // Create super administrator connection and authenticate
  const superAdminConnection: api.IConnection = { host: connection.host };
  await api.functional.discussionBoard.auth.superAdmin.join(
    superAdminConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: typia.random<string & tags.Format<"password">>(),
        privilege_level: "super_admin",
      } satisfies IDiscussionBoardSuperAdmin.IJoin,
    },
  );
  // Generate a valid UUID format that doesn't exist in the database
  const nonExistentCategoryId = typia.random<string & tags.Format<"uuid">>();
  // Attempt to retrieve non-existent ban reason category
  await TestValidator.httpError(
    "non-existent category should return 404",
    404,
    async () => {
      await api.functional.discussionBoard.superAdmin.ban_reason_categories.at(
        superAdminConnection,
        {
          categoryId: nonExistentCategoryId,
        },
      );
    },
  );
}
