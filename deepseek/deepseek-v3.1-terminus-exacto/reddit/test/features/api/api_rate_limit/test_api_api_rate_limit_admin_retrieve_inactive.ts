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

export async function test_api_api_rate_limit_admin_retrieve_inactive(
  connection: api.IConnection,
): Promise<void> {
  // Create admin connection and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      permissions_level: null,
    } satisfies ICommunityPlatformAdmin.IJoin,
  });
  // Create an inactive API rate limit configuration with random data
  const rateLimitConfig: ICommunityPlatformApiRateLimit.ICreate = {
    endpoint_path: RandomGenerator.paragraph({ sentences: 1 }),
    http_method: RandomGenerator.pick([
      "GET",
      "POST",
      "PUT",
      "DELETE",
    ] as const),
    max_requests: typia.random<number & tags.Type<"int32"> & tags.Minimum<1>>(),
    time_window_seconds: typia.random<
      number & tags.Type<"int32"> & tags.Minimum<1>
    >(),
    description: RandomGenerator.paragraph({ sentences: 2 }),
  };
  const createdRateLimit =
    await generate_random_community_platform_admin_api_rate_limits_create(
      adminConnection,
      { body: rateLimitConfig },
    );
  typia.assert(createdRateLimit);
  // Retrieve the inactive rate limit configuration
  const retrievedRateLimit =
    await api.functional.communityPlatform.admin.api_rate_limits.at(
      adminConnection,
      { apiRateLimitId: createdRateLimit.id },
    );
  typia.assert(retrievedRateLimit);
  // Validate that all configuration details match
  TestValidator.equals(
    "endpoint path matches",
    retrievedRateLimit.endpointPath,
    createdRateLimit.endpointPath,
  );
  TestValidator.equals(
    "HTTP method matches",
    retrievedRateLimit.httpMethod,
    createdRateLimit.httpMethod,
  );
  TestValidator.equals(
    "max requests matches",
    retrievedRateLimit.maxRequests,
    createdRateLimit.maxRequests,
  );
  TestValidator.equals(
    "time window matches",
    retrievedRateLimit.timeWindowSeconds,
    createdRateLimit.timeWindowSeconds,
  );
  TestValidator.equals(
    "description matches",
    retrievedRateLimit.description,
    createdRateLimit.description,
  );
  TestValidator.equals("isActive is false", retrievedRateLimit.isActive, false);
  TestValidator.equals(
    "current usage matches",
    retrievedRateLimit.currentUsage,
    createdRateLimit.currentUsage,
  );
}
