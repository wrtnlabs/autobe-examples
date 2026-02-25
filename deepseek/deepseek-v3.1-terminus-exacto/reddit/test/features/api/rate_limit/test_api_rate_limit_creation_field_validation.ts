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

export async function test_api_rate_limit_creation_field_validation(
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
  // Test valid optional description field
  const rateLimitWithNullDescription =
    await api.functional.communityPlatform.admin.api_rate_limits.create(
      adminConnection,
      {
        body: {
          endpoint_path: "/api/test1",
          http_method: "GET",
          max_requests: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1>
          >(),
          time_window_seconds: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1>
          >(),
          description: null,
        } satisfies ICommunityPlatformApiRateLimit.ICreate,
      },
    );
  typia.assert(rateLimitWithNullDescription);
  const rateLimitWithStringDescription =
    await api.functional.communityPlatform.admin.api_rate_limits.create(
      adminConnection,
      {
        body: {
          endpoint_path: "/api/test2",
          http_method: "POST",
          max_requests: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1>
          >(),
          time_window_seconds: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1>
          >(),
          description: "Rate limit for testing purposes",
        } satisfies ICommunityPlatformApiRateLimit.ICreate,
      },
    );
  typia.assert(rateLimitWithStringDescription);
  // Test valid HTTP methods
  const httpMethods = [
    "GET",
    "POST",
    "PUT",
    "DELETE",
    "PATCH",
    "HEAD",
  ] as const;
  for (const method of httpMethods) {
    const rateLimit =
      await api.functional.communityPlatform.admin.api_rate_limits.create(
        adminConnection,
        {
          body: {
            endpoint_path: `/api/test/${method.toLowerCase()}`,
            http_method: method,
            max_requests: typia.random<
              number & tags.Type<"int32"> & tags.Minimum<1>
            >(),
            time_window_seconds: typia.random<
              number & tags.Type<"int32"> & tags.Minimum<1>
            >(),
          } satisfies ICommunityPlatformApiRateLimit.ICreate,
        },
      );
    typia.assert(rateLimit);
    TestValidator.equals("http method matches", rateLimit.httpMethod, method);
  }
  // Test valid endpoint path formats
  const endpointPaths = [
    "/api/posts",
    "/api/comments/*",
    "/api/users/{id}",
    "/api/v1/auth/login",
    "/api/admin/reports",
  ];
  for (const path of endpointPaths) {
    const rateLimit =
      await api.functional.communityPlatform.admin.api_rate_limits.create(
        adminConnection,
        {
          body: {
            endpoint_path: path,
            http_method: RandomGenerator.pick([
              "GET",
              "POST",
              "PUT",
              "DELETE",
            ] as const),
            max_requests: typia.random<
              number & tags.Type<"int32"> & tags.Minimum<1>
            >(),
            time_window_seconds: typia.random<
              number & tags.Type<"int32"> & tags.Minimum<1>
            >(),
          } satisfies ICommunityPlatformApiRateLimit.ICreate,
        },
      );
    typia.assert(rateLimit);
    TestValidator.equals("endpoint path matches", rateLimit.endpointPath, path);
  }
  // Test valid boundary values
  const minRateLimit =
    await api.functional.communityPlatform.admin.api_rate_limits.create(
      adminConnection,
      {
        body: {
          endpoint_path: "/api/min",
          http_method: "GET",
          max_requests: 1,
          time_window_seconds: 1,
        } satisfies ICommunityPlatformApiRateLimit.ICreate,
      },
    );
  typia.assert(minRateLimit);
  TestValidator.equals("min max_requests", minRateLimit.maxRequests, 1);
  TestValidator.equals(
    "min time_window_seconds",
    minRateLimit.timeWindowSeconds,
    1,
  );
  const largeRateLimit =
    await api.functional.communityPlatform.admin.api_rate_limits.create(
      adminConnection,
      {
        body: {
          endpoint_path: "/api/large",
          http_method: "GET",
          max_requests: 1000000,
          time_window_seconds: 86400,
        } satisfies ICommunityPlatformApiRateLimit.ICreate,
      },
    );
  typia.assert(largeRateLimit);
  TestValidator.equals(
    "large max_requests",
    largeRateLimit.maxRequests,
    1000000,
  );
  TestValidator.equals(
    "large time_window_seconds",
    largeRateLimit.timeWindowSeconds,
    86400,
  );
  // Test business logic: duplicate endpoint and method combination
  const duplicateBody = {
    endpoint_path: "/api/duplicate",
    http_method: "GET",
    max_requests: typia.random<number & tags.Type<"int32"> & tags.Minimum<1>>(),
    time_window_seconds: typia.random<
      number & tags.Type<"int32"> & tags.Minimum<1>
    >(),
  } satisfies ICommunityPlatformApiRateLimit.ICreate;
  const firstRateLimit =
    await api.functional.communityPlatform.admin.api_rate_limits.create(
      adminConnection,
      {
        body: duplicateBody,
      },
    );
  typia.assert(firstRateLimit);
  await TestValidator.error("duplicate endpoint and method", async () => {
    await api.functional.communityPlatform.admin.api_rate_limits.create(
      adminConnection,
      {
        body: duplicateBody,
      },
    );
  });
}
