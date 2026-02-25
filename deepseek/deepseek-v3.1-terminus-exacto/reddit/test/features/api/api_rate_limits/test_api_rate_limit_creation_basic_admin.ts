import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformApiRateLimit } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformApiRateLimit";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { generate_random_community_platform_admin_api_rate_limits_create } from "../../../generate/generate_random_community_platform_admin_api_rate_limits_create";
import { prepare_random_community_platform_api_rate_limit } from "../../../prepare/prepare_random_community_platform_api_rate_limit";

export async function test_api_rate_limit_creation_basic_admin(
  connection: api.IConnection,
): Promise<void> {
  // Create admin connection and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      permissions_level: null,
    } satisfies ICommunityPlatformAdmin.IJoin,
  });
  typia.assert(admin);
  // Create first rate limit configuration using utility function
  const rateLimitCreate: ICommunityPlatformApiRateLimit.ICreate = {
    endpoint_path: "/api/posts",
    http_method: "POST",
    max_requests: typia.random<number & tags.Type<"int32"> & tags.Minimum<1>>(),
    time_window_seconds: typia.random<
      number & tags.Type<"int32"> & tags.Minimum<1>
    >(),
    description: "Rate limit for creating posts",
  } satisfies ICommunityPlatformApiRateLimit.ICreate;
  const rateLimit =
    await generate_random_community_platform_admin_api_rate_limits_create(
      adminConnection,
      { body: rateLimitCreate },
    );
  typia.assert(rateLimit);
  // Validate default values
  TestValidator.equals("current_usage should be 0", rateLimit.currentUsage, 0);
  TestValidator.predicate(
    "is_active should be true",
    rateLimit.isActive === true,
  );
  // Validate timestamp calculations
  const windowStartTime = new Date(rateLimit.windowStartTime);
  const windowEndTime = new Date(rateLimit.windowEndTime);
  const expectedEndTime = new Date(
    windowStartTime.getTime() + rateLimitCreate.time_window_seconds * 1000,
  );
  TestValidator.predicate(
    "window_end_time should be calculated correctly",
    Math.abs(windowEndTime.getTime() - expectedEndTime.getTime()) < 2000,
  );
  // Test uniqueness constraint - attempt to create duplicate
  await TestValidator.error("duplicate rate limit should fail", async () => {
    await generate_random_community_platform_admin_api_rate_limits_create(
      adminConnection,
      { body: rateLimitCreate },
    );
  });
  // Create a different rate limit configuration to verify normal operation still works
  const differentRateLimitCreate: ICommunityPlatformApiRateLimit.ICreate = {
    endpoint_path: "/api/comments",
    http_method: "POST",
    max_requests: typia.random<number & tags.Type<"int32"> & tags.Minimum<1>>(),
    time_window_seconds: typia.random<
      number & tags.Type<"int32"> & tags.Minimum<1>
    >(),
    description: "Rate limit for creating comments",
  } satisfies ICommunityPlatformApiRateLimit.ICreate;
  const differentRateLimit =
    await generate_random_community_platform_admin_api_rate_limits_create(
      adminConnection,
      { body: differentRateLimitCreate },
    );
  typia.assert(differentRateLimit);
  // Validate the second rate limit also has correct defaults
  TestValidator.equals(
    "second rate limit current_usage should be 0",
    differentRateLimit.currentUsage,
    0,
  );
  TestValidator.predicate(
    "second rate limit is_active should be true",
    differentRateLimit.isActive === true,
  );
}
