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

import { authorize_super_admin_join } from "../../../authorize/authorize_super_admin_join";
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";

/**
 * Test boundary value scenarios for API rate limit updates.
 * A super administrator authenticates and updates an existing rate limit
 * configuration with extreme boundary values including minimum/maximum
 * request limits, very short/long intervals, and various enforcement actions.
 */
export async function test_api_api_rate_limit_update_boundary_values(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as super administrator
  const superAdminConnection: api.IConnection = { host: connection.host };
  const superAdmin = await authorize_super_admin_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      privilege_level: "super_admin",
    } satisfies IDiscussionBoardSuperAdmin.IJoin,
  });
  typia.assert(superAdmin);
  // Since we don't have a create endpoint utility, we'll use a valid rateLimitId
  // that should exist in the system for testing boundary value updates
  const rateLimitId = typia.random<string & tags.Format<"uuid">>();
  // Test boundary values with proper endpoint_path and http_method
  const baseConfig = {
    endpoint_path: "/api/test",
    http_method: "GET",
    rate_limit_type: "ip_based",
  };
  // 3. Test boundary values for requests_per_interval
  const minRequests = 1; // Minimum allowed value
  const maxRequests = 2147483647; // Maximum int32 value
  // Test minimum requests per interval (1)
  const minRequestsUpdate =
    await api.functional.discussionBoard.superAdmin.api_rate_limits.update(
      superAdminConnection,
      {
        rateLimitId,
        body: {
          ...baseConfig,
          requests_per_interval: minRequests,
        } satisfies IDiscussionBoardApiRateLimit.IUpdate,
      },
    );
  typia.assert(minRequestsUpdate);
  // Test maximum requests per interval (int32 max)
  const maxRequestsUpdate =
    await api.functional.discussionBoard.superAdmin.api_rate_limits.update(
      superAdminConnection,
      {
        rateLimitId,
        body: {
          ...baseConfig,
          requests_per_interval: maxRequests,
        } satisfies IDiscussionBoardApiRateLimit.IUpdate,
      },
    );
  typia.assert(maxRequestsUpdate);
  // 4. Test boundary values for interval_seconds
  const minInterval = 1; // Minimum allowed value
  const maxInterval = 2147483647; // Maximum int32 value
  // Test minimum interval seconds (1)
  const minIntervalUpdate =
    await api.functional.discussionBoard.superAdmin.api_rate_limits.update(
      superAdminConnection,
      {
        rateLimitId,
        body: {
          ...baseConfig,
          interval_seconds: minInterval,
        } satisfies IDiscussionBoardApiRateLimit.IUpdate,
      },
    );
  typia.assert(minIntervalUpdate);
  // Test maximum interval seconds (int32 max)
  const maxIntervalUpdate =
    await api.functional.discussionBoard.superAdmin.api_rate_limits.update(
      superAdminConnection,
      {
        rateLimitId,
        body: {
          ...baseConfig,
          interval_seconds: maxInterval,
        } satisfies IDiscussionBoardApiRateLimit.IUpdate,
      },
    );
  typia.assert(maxIntervalUpdate);
  // 5. Test boundary values for burst_limit
  const minBurst = 0; // Minimum allowed value
  const maxBurst = 2147483647; // Maximum int32 value
  // Test minimum burst limit (0)
  const minBurstUpdate =
    await api.functional.discussionBoard.superAdmin.api_rate_limits.update(
      superAdminConnection,
      {
        rateLimitId,
        body: {
          ...baseConfig,
          burst_limit: minBurst,
        } satisfies IDiscussionBoardApiRateLimit.IUpdate,
      },
    );
  typia.assert(minBurstUpdate);
  // Test maximum burst limit (int32 max)
  const maxBurstUpdate =
    await api.functional.discussionBoard.superAdmin.api_rate_limits.update(
      superAdminConnection,
      {
        rateLimitId,
        body: {
          ...baseConfig,
          burst_limit: maxBurst,
        } satisfies IDiscussionBoardApiRateLimit.IUpdate,
      },
    );
  typia.assert(maxBurstUpdate);
  // Test null burst limit
  const nullBurstUpdate =
    await api.functional.discussionBoard.superAdmin.api_rate_limits.update(
      superAdminConnection,
      {
        rateLimitId,
        body: {
          ...baseConfig,
          burst_limit: null,
        } satisfies IDiscussionBoardApiRateLimit.IUpdate,
      },
    );
  typia.assert(nullBurstUpdate);
  // 6. Test various enforcement_action values
  const enforcementActions = ["block", "throttle", "warning"] as const;
  for (const action of enforcementActions) {
    const actionUpdate =
      await api.functional.discussionBoard.superAdmin.api_rate_limits.update(
        superAdminConnection,
        {
          rateLimitId,
          body: {
            ...baseConfig,
            enforcement_action: action,
          } satisfies IDiscussionBoardApiRateLimit.IUpdate,
        },
      );
    typia.assert(actionUpdate);
  }
  // 7. Test boolean boundary for is_active
  const trueUpdate =
    await api.functional.discussionBoard.superAdmin.api_rate_limits.update(
      superAdminConnection,
      {
        rateLimitId,
        body: {
          ...baseConfig,
          is_active: true,
        } satisfies IDiscussionBoardApiRateLimit.IUpdate,
      },
    );
  typia.assert(trueUpdate);
  const falseUpdate =
    await api.functional.discussionBoard.superAdmin.api_rate_limits.update(
      superAdminConnection,
      {
        rateLimitId,
        body: {
          ...baseConfig,
          is_active: false,
        } satisfies IDiscussionBoardApiRateLimit.IUpdate,
      },
    );
  typia.assert(falseUpdate);
  // 8. Test null/undefined handling for optional fields
  const optionalFieldsUpdate =
    await api.functional.discussionBoard.superAdmin.api_rate_limits.update(
      superAdminConnection,
      {
        rateLimitId,
        body: {
          ...baseConfig,
          description: null,
        } satisfies IDiscussionBoardApiRateLimit.IUpdate,
      },
    );
  typia.assert(optionalFieldsUpdate);
  // 9. Test rate_limit_type boundary values
  const rateLimitTypes = ["ip_based", "user_based", "global", "burst"] as const;
  for (const rateType of rateLimitTypes) {
    const typeUpdate =
      await api.functional.discussionBoard.superAdmin.api_rate_limits.update(
        superAdminConnection,
        {
          rateLimitId,
          body: {
            ...baseConfig,
            rate_limit_type: rateType,
          } satisfies IDiscussionBoardApiRateLimit.IUpdate,
        },
      );
    typia.assert(typeUpdate);
  }
  // 10. Test comprehensive boundary update
  const comprehensiveUpdate =
    await api.functional.discussionBoard.superAdmin.api_rate_limits.update(
      superAdminConnection,
      {
        rateLimitId,
        body: {
          endpoint_path: "/api/test",
          http_method: "GET",
          rate_limit_type: "ip_based",
          requests_per_interval: minRequests,
          interval_seconds: maxInterval,
          burst_limit: maxBurst,
          enforcement_action: "block",
          is_active: true,
          description: "Comprehensive boundary test",
        } satisfies IDiscussionBoardApiRateLimit.IUpdate,
      },
    );
  typia.assert(comprehensiveUpdate);
}
