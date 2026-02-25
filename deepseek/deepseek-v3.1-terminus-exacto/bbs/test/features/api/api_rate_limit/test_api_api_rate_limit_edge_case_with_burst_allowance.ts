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

/**
 * Test creating API rate limit configuration with burst allowance.
 * Tests edge case: user-based rate limiting for comment posting with burst capability.
 */
export async function test_api_api_rate_limit_edge_case_with_burst_allowance(
  connection: api.IConnection,
): Promise<void> {
  // 1. Administrator setup
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
  // 2. Create rate limit configuration with burst allowance using utility function
  const createdRateLimit =
    await generate_random_discussion_board_admin_api_rate_limits_create(
      adminConnection,
      {
        body: {
          endpoint_path: "/discussionBoard/articles/{articleId}/comments",
          http_method: "POST",
          rate_limit_type: "user_based",
          requests_per_interval: 50,
          interval_seconds: 3600,
          burst_limit: 10,
          enforcement_action: "throttle",
          is_active: true,
          description:
            "Rate limiting policy for comment posting: 50 requests per hour with 10 request burst allowance to handle legitimate bursts while preventing spam",
        },
      },
    );
  typia.assert(createdRateLimit);
  // 3. Validate business logic configuration
  TestValidator.equals(
    "endpoint path matches",
    createdRateLimit.endpoint_path,
    "/discussionBoard/articles/{articleId}/comments",
  );
  TestValidator.equals(
    "http method matches",
    createdRateLimit.http_method,
    "POST",
  );
  TestValidator.equals(
    "rate limit type matches",
    createdRateLimit.rate_limit_type,
    "user_based",
  );
  TestValidator.equals(
    "requests per interval matches",
    createdRateLimit.requests_per_interval,
    50,
  );
  TestValidator.equals(
    "interval seconds matches",
    createdRateLimit.interval_seconds,
    3600,
  );
  TestValidator.equals("burst limit matches", createdRateLimit.burst_limit, 10);
  TestValidator.equals(
    "enforcement action matches",
    createdRateLimit.enforcement_action,
    "throttle",
  );
  TestValidator.equals("is active matches", createdRateLimit.is_active, true);
  TestValidator.equals(
    "description persists",
    createdRateLimit.description,
    "Rate limiting policy for comment posting: 50 requests per hour with 10 request burst allowance to handle legitimate bursts while preventing spam",
  );
}
