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
 * Test deletion attempt on an API rate limit configuration that has already been soft-deleted.
 *
 * This test validates the idempotency and state management of the deletion operation.
 * It creates a rate limit configuration, deletes it, then attempts to delete it again
 * to verify proper handling of already-deleted resources.
 */
export async function test_api_api_rate_limit_deletion_already_deleted(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as super administrator
  const superAdminConnection: api.IConnection = { host: connection.host };
  await authorize_super_admin_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      privilege_level: "super_admin",
    } satisfies IDiscussionBoardSuperAdmin.IJoin,
  });
  // 2. Create a rate limit configuration
  const rateLimitConfig =
    await generate_random_discussion_board_super_admin_api_rate_limits_create(
      superAdminConnection,
      {
        body: {
          endpoint_path: "/api/test",
          http_method: "GET",
          rate_limit_type: "ip_based",
          requests_per_interval: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1>
          >(),
          interval_seconds: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1>
          >(),
          enforcement_action: "block",
        } satisfies IDiscussionBoardApiRateLimit.ICreate,
      },
    );
  typia.assert(rateLimitConfig);
  // Extract the rate limit ID from the created configuration
  TestValidator.predicate(
    "rate limit configuration created",
    rateLimitConfig.data.length > 0,
  );
  const rateLimitId = rateLimitConfig.data[0].id;
  // 3. Delete the rate limit configuration (first deletion - should succeed)
  await api.functional.discussionBoard.superAdmin.api_rate_limits.erase(
    superAdminConnection,
    {
      rateLimitId: rateLimitId,
    },
  );
  // 4. Attempt to delete the same rate limit configuration again
  // This tests idempotency - should either succeed or return appropriate error
  await TestValidator.error(
    "second deletion of already deleted rate limit",
    async () => {
      await api.functional.discussionBoard.superAdmin.api_rate_limits.erase(
        superAdminConnection,
        {
          rateLimitId: rateLimitId,
        },
      );
    },
  );
}
