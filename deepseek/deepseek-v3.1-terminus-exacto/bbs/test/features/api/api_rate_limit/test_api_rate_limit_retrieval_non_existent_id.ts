import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardApiRateLimit } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardApiRateLimit";
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
 * Test the behavior when attempting to retrieve a rate limit configuration with a non-existent UUID.
 * This scenario validates the system's error handling for invalid rate limit IDs, ensuring appropriate
 * error responses are returned when the requested configuration does not exist in the database.
 * The test verifies that the system returns a meaningful error message indicating the rate limit
 * was not found, without exposing internal database details.
 */
export async function test_api_rate_limit_retrieval_non_existent_id(
  connection: api.IConnection,
): Promise<void> {
  // Create super administrator connection
  const superAdminConnection: api.IConnection = { host: connection.host };
  // Use the provided authorize_super_admin_join utility function
  await authorize_super_admin_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      privilege_level: "super_admin",
    } satisfies IDiscussionBoardSuperAdmin.IJoin,
  });
  // Generate a valid but non-existent UUID
  const nonExistentRateLimitId = typia.random<string & tags.Format<"uuid">>();
  // Attempt to retrieve the non-existent rate limit configuration
  await TestValidator.httpError(
    "rate limit not found",
    404,
    async () =>
      await api.functional.discussionBoard.superAdmin.api_rate_limits.at(
        superAdminConnection,
        {
          rateLimitId: nonExistentRateLimitId,
        },
      ),
  );
}
