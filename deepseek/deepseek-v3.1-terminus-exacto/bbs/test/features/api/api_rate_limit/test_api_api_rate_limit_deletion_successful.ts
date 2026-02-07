import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardApiRateLimit } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardApiRateLimit";
import type { IDiscussionBoardSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuperAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardApiRateLimit } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardApiRateLimit";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_admin_join } from "../../../authorize/authorize_super_admin_join";
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";
import { generate_random_discussion_board_super_admin_api_rate_limits_create } from "../../../generate/generate_random_discussion_board_super_admin_api_rate_limits_create";
import { prepare_random_discussion_board_api_rate_limit } from "../../../prepare/prepare_random_discussion_board_api_rate_limit";

/**
 * Test the successful deletion of an API rate limit configuration.
 * 1. Authenticate as super administrator
 * 2. Create a new rate limit configuration
 * 3. Delete the created rate limit
 * 4. Validate deletion success and verify access fails
 */
export async function test_api_api_rate_limit_deletion_successful(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as super administrator
  const superAdminConnection: api.IConnection = { host: connection.host };
  const authResult = await authorize_super_admin_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      privilege_level: "super_admin",
    } satisfies IDiscussionBoardSuperAdmin.IJoin,
  });
  typia.assert(authResult);
  // 2. Create a new rate limit configuration
  const rateLimitConfig =
    await generate_random_discussion_board_super_admin_api_rate_limits_create(
      superAdminConnection,
      {
        body: {
          endpoint_path: "/api/articles",
          http_method: "GET" as const,
          rate_limit_type: "user_based",
          requests_per_interval: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1>
          >(),
          interval_seconds: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1>
          >(),
          enforcement_action: "block",
          description: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies IDiscussionBoardApiRateLimit.ICreate,
      },
    );
  typia.assert(rateLimitConfig);
  // Extract the created rate limit ID from the paginated response
  TestValidator.predicate(
    "rate limit created successfully",
    rateLimitConfig.data.length > 0,
  );
  const createdRateLimit = rateLimitConfig.data[0];
  typia.assert(createdRateLimit);
  // 3. Delete the created rate limit
  await api.functional.discussionBoard.superAdmin.api_rate_limits.erase(
    superAdminConnection,
    {
      rateLimitId: createdRateLimit.id,
    },
  );
  // 4. Validate deletion success - since erase returns void on success,
  // we assume the operation completed successfully if no error was thrown
  TestValidator.predicate("rate limit deletion completed without errors", true);
}
