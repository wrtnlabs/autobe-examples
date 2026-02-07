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

export async function test_api_rate_limit_creation_with_burst_protection(
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
  // Create rate limit configuration with burst protection
  const rateLimitConfig: IDiscussionBoardApiRateLimit.ICreate = {
    endpoint_path: "/discussionBoard/user/articles/{articleId}/comments",
    http_method: "POST",
    rate_limit_type: "user_based",
    requests_per_interval: 5,
    interval_seconds: 30,
    burst_limit: 3,
    enforcement_action: "throttle",
    description: "Rate limit for comment creation with burst protection",
  } satisfies IDiscussionBoardApiRateLimit.ICreate;
  // Create the rate limit configuration
  const result =
    await generate_random_discussion_board_super_admin_api_rate_limits_create(
      superAdminConnection,
      {
        body: rateLimitConfig,
      },
    );
  typia.assert(result);
  // Validate the response structure
  TestValidator.equals(
    "response should contain pagination",
    typeof result.pagination,
    "object",
  );
  TestValidator.equals(
    "response should contain data array",
    Array.isArray(result.data),
    true,
  );
  TestValidator.predicate(
    "data array should contain at least one rate limit",
    result.data.length >= 1,
  );
  const createdRateLimit = result.data[0];
  // Validate burst_limit is properly set and not null/undefined
  TestValidator.predicate(
    "burst_limit should be defined",
    createdRateLimit.burst_limit !== undefined &&
      createdRateLimit.burst_limit !== null,
  );
  TestValidator.equals(
    "burst_limit should match input",
    createdRateLimit.burst_limit,
    3,
  );
  // Validate other configuration parameters
  TestValidator.equals(
    "endpoint_path should match",
    createdRateLimit.endpoint_path,
    "/discussionBoard/user/articles/{articleId}/comments",
  );
  TestValidator.equals(
    "http_method should match",
    createdRateLimit.http_method,
    "POST",
  );
  TestValidator.equals(
    "rate_limit_type should match",
    createdRateLimit.rate_limit_type,
    "user_based",
  );
  TestValidator.equals(
    "requests_per_interval should match",
    createdRateLimit.requests_per_interval,
    5,
  );
  TestValidator.equals(
    "interval_seconds should match",
    createdRateLimit.interval_seconds,
    30,
  );
  TestValidator.equals(
    "enforcement_action should match",
    createdRateLimit.enforcement_action,
    "throttle",
  );
  // Validate configuration is active
  TestValidator.predicate(
    "rate limit should be active",
    createdRateLimit.is_active,
  );
  // Validate enforcement count starts at 0
  TestValidator.equals(
    "enforcement_count should start at 0",
    createdRateLimit.enforcement_count,
    0,
  );
  // Validate enforced_at is null initially
  TestValidator.equals(
    "enforced_at should be null initially",
    createdRateLimit.enforced_at,
    null,
  );
}
