import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
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
 * Test the behavior when attempting to delete a non-existent API rate limit configuration.
 * 1. Authenticate as administrator via join
 * 2. Call DELETE endpoint with randomly generated UUID that doesn't exist
 * 3. Validate operation returns HTTP 404 Not Found
 * 4. Confirm proper error handling for non-existing resources
 */
export async function test_api_api_rate_limit_deletion_non_existing_id(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as administrator
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IDiscussionBoardAdmin.IJoin,
  });
  // 2. Attempt to delete non-existent rate limit
  const nonExistentRateLimitId = typia.random<string & tags.Format<"uuid">>();
  // 3. Validate HTTP 404 error is thrown
  await TestValidator.httpError(
    "should return 404 for non-existent rate limit",
    404,
    async () => {
      await api.functional.discussionBoard.admin.api_rate_limits.erase(
        adminConnection,
        {
          rateLimitId: nonExistentRateLimitId,
        },
      );
    },
  );
}
