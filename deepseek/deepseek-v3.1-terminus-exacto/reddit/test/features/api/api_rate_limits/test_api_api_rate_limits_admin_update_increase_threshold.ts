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

export async function test_api_api_rate_limits_admin_update_increase_threshold(
  connection: api.IConnection,
): Promise<void> {
  // Create admin connection
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      permissions_level: null,
    } satisfies ICommunityPlatformAdmin.IJoin,
  });
  // Create initial conservative rate limit configuration
  const initialRateLimit =
    await generate_random_community_platform_admin_api_rate_limits_create(
      adminConnection,
      {
        body: {
          endpoint_path: "/api/test-endpoint",
          http_method: "GET",
          max_requests: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<10>
          >(),
          time_window_seconds: typia.random<
            number &
              tags.Type<"int32"> &
              tags.Minimum<3600> &
              tags.Maximum<7200>
          >(),
          description: "Initial conservative rate limit",
        } satisfies ICommunityPlatformApiRateLimit.ICreate,
      },
    );
  typia.assert(initialRateLimit);
  // Update to handle traffic spikes - significantly increase max_requests and reduce time_window_seconds
  const updatedRateLimit =
    await api.functional.communityPlatform.admin.api_rate_limits.update(
      adminConnection,
      {
        apiRateLimitId: initialRateLimit.id,
        body: {
          max_requests: typia.random<
            number &
              tags.Type<"int32"> &
              tags.Minimum<1000> &
              tags.Maximum<5000>
          >(),
          time_window_seconds: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<60> & tags.Maximum<300>
          >(),
          description: "Updated for traffic spike handling",
        } satisfies ICommunityPlatformApiRateLimit.IUpdate,
      },
    );
  typia.assert(updatedRateLimit);
  // Validate the update was successful
  TestValidator.equals(
    "rate limit ID remains the same",
    updatedRateLimit.id,
    initialRateLimit.id,
  );
  TestValidator.equals(
    "endpoint path remains unchanged",
    updatedRateLimit.endpointPath,
    initialRateLimit.endpointPath,
  );
  TestValidator.equals(
    "HTTP method remains unchanged",
    updatedRateLimit.httpMethod,
    initialRateLimit.httpMethod,
  );
  TestValidator.notEquals(
    "max_requests increased significantly",
    updatedRateLimit.maxRequests,
    initialRateLimit.maxRequests,
  );
  TestValidator.notEquals(
    "time_window_seconds reduced significantly",
    updatedRateLimit.timeWindowSeconds,
    initialRateLimit.timeWindowSeconds,
  );
  TestValidator.predicate(
    "max_requests is significantly higher",
    updatedRateLimit.maxRequests > initialRateLimit.maxRequests,
  );
  TestValidator.predicate(
    "time_window_seconds is significantly lower",
    updatedRateLimit.timeWindowSeconds < initialRateLimit.timeWindowSeconds,
  );
  TestValidator.predicate(
    "is_active remains true",
    updatedRateLimit.isActive === true,
  );
  // Calculate effective rate limits per second
  const initialRatePerSecond =
    initialRateLimit.maxRequests / initialRateLimit.timeWindowSeconds;
  const updatedRatePerSecond =
    updatedRateLimit.maxRequests / updatedRateLimit.timeWindowSeconds;
  TestValidator.predicate(
    "effective rate per second increased significantly",
    updatedRatePerSecond > initialRatePerSecond,
  );
}
