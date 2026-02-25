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

export async function test_api_api_rate_limit_admin_retrieve_existing(
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
  // Create a rate limit configuration with random data
  const createdRateLimit =
    await generate_random_community_platform_admin_api_rate_limits_create(
      adminConnection,
      {
        body: {
          endpoint_path: `/api/${RandomGenerator.alphabets(10)}`,
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
          description: RandomGenerator.paragraph({ sentences: 1 }),
        } satisfies ICommunityPlatformApiRateLimit.ICreate,
      },
    );
  typia.assert(createdRateLimit);
  // Retrieve the created rate limit
  const retrievedRateLimit =
    await api.functional.communityPlatform.admin.api_rate_limits.at(
      adminConnection,
      {
        apiRateLimitId: createdRateLimit.id,
      },
    );
  typia.assert(retrievedRateLimit);
  // Validate business logic - current usage should be properly initialized to 0
  TestValidator.equals(
    "current usage initialized to 0",
    retrievedRateLimit.currentUsage,
    0,
  );
  // Validate that retrieved configuration matches created one
  TestValidator.equals(
    "rate limit configuration matches",
    retrievedRateLimit.id,
    createdRateLimit.id,
  );
}
