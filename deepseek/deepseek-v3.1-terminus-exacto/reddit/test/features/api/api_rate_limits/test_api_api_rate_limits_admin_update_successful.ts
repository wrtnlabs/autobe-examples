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

export async function test_api_api_rate_limits_admin_update_successful(
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
  // Create initial rate limit configuration
  const initialRateLimit =
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
          description: "Initial rate limit configuration",
        } satisfies ICommunityPlatformApiRateLimit.ICreate,
      },
    );
  typia.assert(initialRateLimit);
  // Update the rate limit configuration
  const updateData: ICommunityPlatformApiRateLimit.IUpdate = {
    endpoint_path: "/api/test/updated",
    http_method: "POST",
    max_requests: typia.random<number & tags.Type<"int32"> & tags.Minimum<1>>(),
    time_window_seconds: typia.random<
      number & tags.Type<"int32"> & tags.Minimum<1>
    >(),
    is_active: false,
    description: "Updated rate limit configuration",
  };
  const updatedRateLimit =
    await api.functional.communityPlatform.admin.api_rate_limits.update(
      adminConnection,
      {
        apiRateLimitId: initialRateLimit.id,
        body: updateData,
      },
    );
  typia.assert(updatedRateLimit);
  // Validate updated fields
  TestValidator.equals(
    "endpoint path updated",
    updatedRateLimit.endpointPath,
    updateData.endpoint_path!,
  );
  TestValidator.equals(
    "HTTP method updated",
    updatedRateLimit.httpMethod,
    updateData.http_method!,
  );
  TestValidator.equals(
    "max requests updated",
    updatedRateLimit.maxRequests,
    typia.assert<number & tags.Type<"int32"> & tags.Minimum<1>>(updateData.max_requests!),
  );
  TestValidator.equals(
    "time window updated",
    updatedRateLimit.timeWindowSeconds,
    typia.assert<number & tags.Type<"int32"> & tags.Minimum<1>>(updateData.time_window_seconds!),
  );
  TestValidator.equals(
    "is_active updated",
    updatedRateLimit.isActive,
    updateData.is_active!,
  );
  TestValidator.equals(
    "description updated",
    updatedRateLimit.description,
    updateData.description!,
  );
  // Validate system-managed timestamps
  TestValidator.equals(
    "created_at unchanged",
    updatedRateLimit.createdAt,
    initialRateLimit.createdAt,
  );
  TestValidator.notEquals(
    "updated_at changed",
    updatedRateLimit.updatedAt,
    initialRateLimit.updatedAt,
  );
  // Validate other unchanged system fields
  TestValidator.equals(
    "id unchanged",
    updatedRateLimit.id,
    initialRateLimit.id,
  );
  TestValidator.equals("current usage reset", updatedRateLimit.currentUsage, 0);
  TestValidator.predicate(
    "window start time updated",
    new Date(updatedRateLimit.windowStartTime) >
      new Date(initialRateLimit.windowStartTime),
  );
  TestValidator.predicate(
    "window end time updated",
    new Date(updatedRateLimit.windowEndTime) >
      new Date(initialRateLimit.windowEndTime),
  );
  // NOTE: GET operation validation is mentioned in the scenario but no GET endpoint exists in the provided API functions
  // The scenario requires "confirm that the rate limit configuration can be retrieved via the GET operation"
  // However, the provided API functions only show CREATE and UPDATE operations for api_rate_limits
  // This is a limitation of the current API specification
}