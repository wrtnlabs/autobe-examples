import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardCommentRateLimit } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardCommentRateLimit";
import type { IDiscussionBoardSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuperAdmin";
import type { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";
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
 * Test the scenario where a super administrator attempts to retrieve a comment rate limit record
 * with a non-existent rateLimitId. The test verifies that the system returns a 404 Not Found error
 * when the specified rate limit record does not exist in the database.
 */
export async function test_api_super_admin_comment_rate_limit_not_found(
  connection: api.IConnection,
): Promise<void> {
  // Create actor-specific connection for super administrator
  const superAdminConnection: api.IConnection = { host: connection.host };
  // Authenticate as super administrator using utility function
  await authorize_super_admin_join(superAdminConnection, {
    body: {
      privilege_level: "super_admin",
    },
  });
  // Generate a random UUID that does not exist in the database
  const nonExistentRateLimitId = typia.random<string & tags.Format<"uuid">>();
  // Attempt to retrieve non-existent comment rate limit record
  await TestValidator.httpError(
    "should return 404 for non-existent rate limit record",
    404,
    async () =>
      await api.functional.discussionBoard.superAdmin.comment_rate_limits.at(
        superAdminConnection,
        {
          rateLimitId: nonExistentRateLimitId,
        },
      ),
  );
}
