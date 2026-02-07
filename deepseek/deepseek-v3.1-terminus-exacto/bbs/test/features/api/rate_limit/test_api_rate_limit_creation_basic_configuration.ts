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

export async function test_api_rate_limit_creation_basic_configuration(
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
  // Create basic API rate limit configuration with exact values from scenario
  const rateLimitConfig: IDiscussionBoardApiRateLimit.ICreate = {
    endpoint_path: "/discussionBoard/user/articles",
    http_method: "POST",
    rate_limit_type: "user_based",
    requests_per_interval: 10,
    interval_seconds: 60,
    enforcement_action: "block",
  } satisfies IDiscussionBoardApiRateLimit.ICreate;
  // Create the rate limit configuration
  const response =
    await api.functional.discussionBoard.superAdmin.api_rate_limits.create(
      superAdminConnection,
      {
        body: rateLimitConfig,
      },
    );
  typia.assert(response);
  // Validate the response structure
  TestValidator.equals(
    "response should have pagination",
    typeof response.pagination,
    "object",
  );
  TestValidator.equals(
    "response should have data array",
    Array.isArray(response.data),
    true,
  );
  TestValidator.predicate(
    "data array should not be empty",
    response.data.length > 0,
  );
  // Validate the created rate limit configuration
  const createdConfig = response.data[0];
  typia.assert(createdConfig);
  // Validate business logic values (not type validation)
  TestValidator.equals(
    "endpoint_path should match",
    createdConfig.endpoint_path,
    rateLimitConfig.endpoint_path,
  );
  TestValidator.equals(
    "http_method should match",
    createdConfig.http_method,
    rateLimitConfig.http_method,
  );
  TestValidator.equals(
    "rate_limit_type should match",
    createdConfig.rate_limit_type,
    rateLimitConfig.rate_limit_type,
  );
  TestValidator.equals(
    "requests_per_interval should match",
    createdConfig.requests_per_interval,
    rateLimitConfig.requests_per_interval,
  );
  TestValidator.equals(
    "interval_seconds should match",
    createdConfig.interval_seconds,
    rateLimitConfig.interval_seconds,
  );
  TestValidator.equals(
    "enforcement_action should match",
    createdConfig.enforcement_action,
    rateLimitConfig.enforcement_action,
  );
  TestValidator.predicate(
    "is_active should be true",
    createdConfig.is_active === true,
  );
  TestValidator.equals(
    "enforcement_count should be 0",
    createdConfig.enforcement_count,
    0,
  );
}
