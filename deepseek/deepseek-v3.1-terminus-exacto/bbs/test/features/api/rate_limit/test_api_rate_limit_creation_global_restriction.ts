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

export async function test_api_rate_limit_creation_global_restriction(
  connection: api.IConnection,
): Promise<void> {
  // Create super admin connection
  const superAdminConnection: api.IConnection = { host: connection.host };
  await authorize_super_admin_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      privilege_level: "super_admin",
    } satisfies IDiscussionBoardSuperAdmin.IJoin,
  });
  // Create global rate limit configuration for search endpoint using utility function
  const rateLimitConfig =
    await generate_random_discussion_board_super_admin_api_rate_limits_create(
      superAdminConnection,
      {
        body: {
          endpoint_path: "/discussionBoard/user/search",
          http_method: "PATCH",
          rate_limit_type: "global",
          requests_per_interval: 100,
          interval_seconds: 3600,
          enforcement_action: "warning",
          description: null,
        } satisfies DeepPartial<IDiscussionBoardApiRateLimit.ICreate>,
      },
    );
  typia.assert(rateLimitConfig);
  // Validate the response structure
  TestValidator.predicate(
    "response should have data array",
    rateLimitConfig.data.length > 0,
  );
  const createdRateLimit = rateLimitConfig.data[0];
  // Validate the created rate limit configuration
  TestValidator.equals(
    "endpoint path should match",
    createdRateLimit.endpoint_path,
    "/discussionBoard/user/search",
  );
  TestValidator.equals(
    "http method should be PATCH",
    createdRateLimit.http_method,
    "PATCH",
  );
  TestValidator.equals(
    "rate limit type should be global",
    createdRateLimit.rate_limit_type,
    "global",
  );
  TestValidator.equals(
    "requests per interval should be 100",
    createdRateLimit.requests_per_interval,
    100,
  );
  TestValidator.equals(
    "interval seconds should be 3600",
    createdRateLimit.interval_seconds,
    3600,
  );
  TestValidator.equals(
    "enforcement action should be warning",
    createdRateLimit.enforcement_action,
    "warning",
  );
  TestValidator.predicate(
    "rate limit should be active",
    createdRateLimit.is_active,
  );
  TestValidator.equals(
    "enforcement count should be zero initially",
    createdRateLimit.enforcement_count,
    0,
  );
  TestValidator.equals(
    "burst limit should be null",
    createdRateLimit.burst_limit,
    null,
  );
  TestValidator.equals(
    "enforced at should be null initially",
    createdRateLimit.enforced_at,
    null,
  );
  // Validate UUID format
  TestValidator.predicate(
    "ID should be valid UUID",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      createdRateLimit.id,
    ),
  );
}
