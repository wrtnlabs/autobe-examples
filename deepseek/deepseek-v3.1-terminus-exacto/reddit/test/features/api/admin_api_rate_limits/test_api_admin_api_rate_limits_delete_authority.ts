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

export async function test_api_admin_api_rate_limits_delete_authority(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create and authenticate admin user
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
  // 2. Create a rate limit configuration for deletion testing
  const rateLimit =
    await generate_random_community_platform_admin_api_rate_limits_create(
      adminConnection,
      {
        body: {
          endpoint_path: "/api/test/endpoint",
          http_method: "GET",
          max_requests: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1>
          >(),
          time_window_seconds: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1>
          >(),
          description: "Test rate limit configuration",
        } satisfies ICommunityPlatformApiRateLimit.ICreate,
      },
    );
  typia.assert(rateLimit);
  // 3. Test unauthorized deletion attempt (no authentication)
  const unauthorizedConnection: api.IConnection = { host: connection.host };
  await TestValidator.httpError("unauthorized deletion", 401, async () => {
    await api.functional.communityPlatform.admin.api_rate_limits.erase(
      unauthorizedConnection,
      {
        apiRateLimitId: rateLimit.id,
      },
    );
  });
  // 4. Test successful deletion with admin authentication
  await api.functional.communityPlatform.admin.api_rate_limits.erase(
    adminConnection,
    {
      apiRateLimitId: rateLimit.id,
    },
  );
  // 5. Verify deletion by attempting to delete non-existent rate limit
  await TestValidator.httpError(
    "delete non-existent rate limit",
    404,
    async () => {
      await api.functional.communityPlatform.admin.api_rate_limits.erase(
        adminConnection,
        {
          apiRateLimitId: rateLimit.id,
        },
      );
    },
  );
}
