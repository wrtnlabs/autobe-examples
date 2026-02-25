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

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { generate_random_discussion_board_admin_api_rate_limits_create } from "../../../generate/generate_random_discussion_board_admin_api_rate_limits_create";
import { prepare_random_discussion_board_api_rate_limit } from "../../../prepare/prepare_random_discussion_board_api_rate_limit";

export async function test_api_admin_api_rate_limits_retrieve_existing(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as admin
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
  // 2. Create a test rate limit configuration using utility function
  const rateLimitConfig =
    await generate_random_discussion_board_admin_api_rate_limits_create(
      adminConnection,
      {
        body: {
          endpoint_path: "/api/test",
          http_method: "GET",
          rate_limit_type: "ip_based",
          enforcement_action: "block",
          is_active: true,
        },
      },
    );
  typia.assert(rateLimitConfig);
  // 3. Retrieve the rate limit configuration
  const retrievedRateLimit =
    await api.functional.discussionBoard.admin.api_rate_limits.at(
      adminConnection,
      {
        rateLimitId: rateLimitConfig.id,
      },
    );
  typia.assert(retrievedRateLimit);
  // 4. Validate retrieved configuration matches created configuration
  TestValidator.equals(
    "rate limit ID matches",
    retrievedRateLimit.id,
    rateLimitConfig.id,
  );
  TestValidator.equals(
    "endpoint path matches",
    retrievedRateLimit.endpoint_path,
    rateLimitConfig.endpoint_path,
  );
  TestValidator.equals(
    "HTTP method matches",
    retrievedRateLimit.http_method,
    rateLimitConfig.http_method,
  );
  TestValidator.equals(
    "rate limit type matches",
    retrievedRateLimit.rate_limit_type,
    rateLimitConfig.rate_limit_type,
  );
  TestValidator.equals(
    "requests per interval matches",
    retrievedRateLimit.requests_per_interval,
    rateLimitConfig.requests_per_interval,
  );
  TestValidator.equals(
    "interval seconds matches",
    retrievedRateLimit.interval_seconds,
    rateLimitConfig.interval_seconds,
  );
  TestValidator.equals(
    "enforcement action matches",
    retrievedRateLimit.enforcement_action,
    rateLimitConfig.enforcement_action,
  );
  TestValidator.equals(
    "is active matches",
    retrievedRateLimit.is_active,
    rateLimitConfig.is_active,
  );
  TestValidator.equals(
    "description matches",
    retrievedRateLimit.description,
    rateLimitConfig.description,
  );
  // 5. Handle burst_limit comparison with null safety
  if (rateLimitConfig.burst_limit === null) {
    TestValidator.equals(
      "burst limit is null",
      retrievedRateLimit.burst_limit,
      null,
    );
  } else {
    TestValidator.equals(
      "burst limit matches",
      retrievedRateLimit.burst_limit,
      rateLimitConfig.burst_limit,
    );
  }
  // 6. Validate additional fields are present
  TestValidator.predicate(
    "has created_at timestamp",
    retrievedRateLimit.created_at !== undefined,
  );
  TestValidator.predicate(
    "has updated_at timestamp",
    retrievedRateLimit.updated_at !== undefined,
  );
  TestValidator.equals(
    "enforcement count is zero",
    retrievedRateLimit.enforcement_count,
    0,
  );
  TestValidator.equals(
    "enforced_at is null",
    retrievedRateLimit.enforced_at,
    null,
  );
  TestValidator.equals(
    "deleted_at is null",
    retrievedRateLimit.deleted_at,
    null,
  );
}
