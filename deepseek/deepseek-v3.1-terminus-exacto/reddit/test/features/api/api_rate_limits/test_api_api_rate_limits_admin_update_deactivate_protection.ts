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

/**
 * Test updating a rate limit configuration to temporarily deactivate protection.
 * 1. Admin creates an active rate limit
 * 2. Update to set is_active=false to disable rate limiting
 * 3. Verify configuration updates successfully
 * 4. Test reactivation by setting is_active=true
 */
export async function test_api_api_rate_limits_admin_update_deactivate_protection(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin setup
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "admin1234",
      display_name: "Test Admin",
    } satisfies ICommunityPlatformAdmin.IJoin,
  });
  // 2. Create an active rate limit
  const rateLimit =
    await generate_random_community_platform_admin_api_rate_limits_create(
      adminConnection,
      {
        body: {
          endpoint_path: "/api/test/endpoint",
          http_method: "GET",
          max_requests: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<1000>
          >(),
          time_window_seconds: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<3600>
          >(),
          description: "Test rate limit for deactivation",
        } satisfies ICommunityPlatformApiRateLimit.ICreate,
      },
    );
  typia.assert(rateLimit);
  TestValidator.predicate("rate limit initially active", rateLimit.isActive);
  // 3. Deactivate the rate limit
  const deactivatedRateLimit =
    await api.functional.communityPlatform.admin.api_rate_limits.update(
      adminConnection,
      {
        apiRateLimitId: rateLimit.id,
        body: {
          is_active: false,
        } satisfies ICommunityPlatformApiRateLimit.IUpdate,
      },
    );
  typia.assert(deactivatedRateLimit);
  TestValidator.equals(
    "rate limit deactivated",
    deactivatedRateLimit.isActive,
    false,
  );
  TestValidator.equals(
    "id remains same",
    deactivatedRateLimit.id,
    rateLimit.id,
  );
  // 4. Reactivate the rate limit
  const reactivatedRateLimit =
    await api.functional.communityPlatform.admin.api_rate_limits.update(
      adminConnection,
      {
        apiRateLimitId: rateLimit.id,
        body: {
          is_active: true,
        } satisfies ICommunityPlatformApiRateLimit.IUpdate,
      },
    );
  typia.assert(reactivatedRateLimit);
  TestValidator.equals(
    "rate limit reactivated",
    reactivatedRateLimit.isActive,
    true,
  );
  TestValidator.equals(
    "id remains consistent",
    reactivatedRateLimit.id,
    rateLimit.id,
  );
  // 5. Verify other properties remain unchanged
  TestValidator.equals(
    "endpoint path unchanged",
    reactivatedRateLimit.endpointPath,
    rateLimit.endpointPath,
  );
  TestValidator.equals(
    "HTTP method unchanged",
    reactivatedRateLimit.httpMethod,
    rateLimit.httpMethod,
  );
  TestValidator.equals(
    "max requests unchanged",
    reactivatedRateLimit.maxRequests,
    rateLimit.maxRequests,
  );
  TestValidator.equals(
    "time window unchanged",
    reactivatedRateLimit.timeWindowSeconds,
    rateLimit.timeWindowSeconds,
  );
}
