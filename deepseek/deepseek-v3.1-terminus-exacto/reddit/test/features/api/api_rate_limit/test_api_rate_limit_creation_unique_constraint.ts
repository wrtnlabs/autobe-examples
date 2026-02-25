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

export async function test_api_rate_limit_creation_unique_constraint(
  connection: api.IConnection,
): Promise<void> {
  // Create admin connection and register admin
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: "admin@test.com",
      password: "password123",
      display_name: "Test Admin",
      permissions_level: null,
    },
  });
  // Create first rate limit configuration
  const firstRateLimit =
    await generate_random_community_platform_admin_api_rate_limits_create(
      adminConnection,
      {
        body: {
          endpoint_path: "/api/posts",
          http_method: "POST",
          max_requests: 100,
          time_window_seconds: 3600,
          description: "Rate limit for creating posts",
        },
      },
    );
  // Attempt to create duplicate rate limit with same endpoint_path and http_method
  await TestValidator.error(
    "duplicate rate limit creation should fail",
    async () => {
      await generate_random_community_platform_admin_api_rate_limits_create(
        adminConnection,
        {
          body: {
            endpoint_path: "/api/posts",
            http_method: "POST",
            max_requests: 200,
            time_window_seconds: 1800,
            description: "Duplicate rate limit",
          },
        },
      );
    },
  );
  // Test with different endpoint patterns
  const patterns = [
    "/api/comments",
    "/api/users/*",
    "/api/v1/posts",
    "/api/v2/comments",
  ];
  for (const pattern of patterns) {
    const rateLimit =
      await generate_random_community_platform_admin_api_rate_limits_create(
        adminConnection,
        {
          body: {
            endpoint_path: pattern,
            http_method: "GET",
            max_requests: 50,
            time_window_seconds: 1800,
            description: `Rate limit for ${pattern}`,
          },
        },
      );
    // Attempt duplicate for this pattern
    await TestValidator.error(
      `duplicate rate limit for pattern ${pattern} should fail`,
      async () => {
        await generate_random_community_platform_admin_api_rate_limits_create(
          adminConnection,
          {
            body: {
              endpoint_path: pattern,
              http_method: "GET",
              max_requests: 75,
              time_window_seconds: 3600,
              description: `Duplicate for ${pattern}`,
            },
          },
        );
      },
    );
  }
  // Test different HTTP methods for same endpoint
  const methods = ["POST", "PUT", "DELETE", "PATCH"];
  const testEndpoint = "/api/test";
  for (const method of methods) {
    const rateLimit =
      await generate_random_community_platform_admin_api_rate_limits_create(
        adminConnection,
        {
          body: {
            endpoint_path: testEndpoint,
            http_method: method,
            max_requests: 100,
            time_window_seconds: 3600,
            description: `Rate limit for ${method} ${testEndpoint}`,
          },
        },
      );
    // Each method should be unique, so no duplicates should be allowed
    await TestValidator.error(
      `duplicate rate limit for ${method} ${testEndpoint} should fail`,
      async () => {
        await generate_random_community_platform_admin_api_rate_limits_create(
          adminConnection,
          {
            body: {
              endpoint_path: testEndpoint,
              http_method: method,
              max_requests: 150,
              time_window_seconds: 1800,
              description: `Duplicate for ${method}`,
            },
          },
        );
      },
    );
  }
}
