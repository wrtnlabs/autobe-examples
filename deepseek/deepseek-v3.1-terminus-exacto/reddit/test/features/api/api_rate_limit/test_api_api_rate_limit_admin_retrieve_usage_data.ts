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

export async function test_api_api_rate_limit_admin_retrieve_usage_data(
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
  // Create a rate limit configuration
  const rateLimit =
    await generate_random_community_platform_admin_api_rate_limits_create(
      adminConnection,
      {
        body: {
          endpoint_path: "/api/test",
          http_method: "GET",
          max_requests: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1>
          >(),
          time_window_seconds: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1>
          >(),
          description: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies ICommunityPlatformApiRateLimit.ICreate,
      },
    );
  typia.assert(rateLimit);
  // Retrieve the rate limit configuration to verify usage data
  const retrievedRateLimit =
    await api.functional.communityPlatform.admin.api_rate_limits.at(
      adminConnection,
      {
        apiRateLimitId: rateLimit.id,
      },
    );
  typia.assert(retrievedRateLimit);
  // Validate that the retrieved configuration matches the created one
  TestValidator.equals(
    "rate limit ID matches",
    retrievedRateLimit.id,
    rateLimit.id,
  );
  TestValidator.equals(
    "endpoint path matches",
    retrievedRateLimit.endpointPath,
    rateLimit.endpointPath,
  );
  TestValidator.equals(
    "HTTP method matches",
    retrievedRateLimit.httpMethod,
    rateLimit.httpMethod,
  );
  TestValidator.equals(
    "max requests matches",
    retrievedRateLimit.maxRequests,
    rateLimit.maxRequests,
  );
  TestValidator.equals(
    "time window matches",
    retrievedRateLimit.timeWindowSeconds,
    rateLimit.timeWindowSeconds,
  );
  TestValidator.equals(
    "description matches",
    retrievedRateLimit.description,
    rateLimit.description,
  );
  TestValidator.predicate("is active", retrievedRateLimit.isActive);
  // Validate usage data and timing information
  TestValidator.equals(
    "current usage is zero initially",
    retrievedRateLimit.currentUsage,
    0,
  );
  TestValidator.predicate(
    "window start time is valid date",
    new Date(retrievedRateLimit.windowStartTime).getTime() > 0,
  );
  TestValidator.predicate(
    "window end time is valid date",
    new Date(retrievedRateLimit.windowEndTime).getTime() > 0,
  );
  // Validate that windowEndTime is after windowStartTime
  const startTime = new Date(retrievedRateLimit.windowStartTime).getTime();
  const endTime = new Date(retrievedRateLimit.windowEndTime).getTime();
  TestValidator.predicate(
    "window end time is after start time",
    endTime > startTime,
  );
  // Validate that the time window duration is correct (with reasonable tolerance)
  const expectedDuration = retrievedRateLimit.timeWindowSeconds * 1000;
  const actualDuration = endTime - startTime;
  TestValidator.predicate(
    "time window duration is reasonable",
    actualDuration >= expectedDuration &&
      actualDuration <= expectedDuration + 5000,
  ); // Allow 5 second tolerance for server processing
}
