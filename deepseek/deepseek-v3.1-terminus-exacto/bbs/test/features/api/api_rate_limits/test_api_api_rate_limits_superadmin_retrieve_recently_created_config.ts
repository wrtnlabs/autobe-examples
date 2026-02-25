import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardApiRateLimit } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardApiRateLimit";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import type { IDiscussionBoardSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuperAdmin";
import type { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { authorize_super_admin_join } from "../../../authorize/authorize_super_admin_join";
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";
import { generate_random_discussion_board_admin_api_rate_limits_create } from "../../../generate/generate_random_discussion_board_admin_api_rate_limits_create";
import { prepare_random_discussion_board_api_rate_limit } from "../../../prepare/prepare_random_discussion_board_api_rate_limit";

export async function test_api_api_rate_limits_superadmin_retrieve_recently_created_config(
  connection: api.IConnection,
): Promise<void> {
  // Create admin connection and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IDiscussionBoardAdmin.IJoin,
  });
  typia.assert(adminAuth);
  // Create superAdmin connection and authenticate
  const superAdminConnection: api.IConnection = { host: connection.host };
  const superAdminAuth = await authorize_super_admin_join(
    superAdminConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
        ip: typia.random<string & tags.Format<"ipv4">>(),
      } satisfies IDiscussionBoardSuperAdmin.IJoin,
    },
  );
  typia.assert(superAdminAuth);
  // Create a new rate limit configuration
  const rateLimitConfig =
    await generate_random_discussion_board_admin_api_rate_limits_create(
      adminConnection,
      {
        body: {
          endpoint_path: "/api/" + RandomGenerator.alphabets(10),
          http_method: RandomGenerator.pick([
            "GET",
            "POST",
            "PUT",
            "DELETE",
          ] as const),
          rate_limit_type: RandomGenerator.pick([
            "ip_based",
            "user_based",
            "global",
            "burst",
          ] as const),
          requests_per_interval: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1>
          >(),
          interval_seconds: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1>
          >(),
          burst_limit: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<0>
          >(),
          enforcement_action: RandomGenerator.pick([
            "block",
            "throttle",
            "warning",
          ] as const),
          is_active: true,
          description: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies IDiscussionBoardApiRateLimit.ICreate,
      },
    );
  typia.assert(rateLimitConfig);
  // Retrieve the created configuration using superAdmin
  const retrievedConfig =
    await api.functional.discussionBoard.superAdmin.api_rate_limits.at(
      superAdminConnection,
      {
        rateLimitId: rateLimitConfig.id,
      },
    );
  typia.assert(retrievedConfig);
  // Validate the retrieved configuration matches the created one
  TestValidator.equals(
    "rate limit ID matches",
    retrievedConfig.id,
    rateLimitConfig.id,
  );
  TestValidator.equals(
    "endpoint path matches",
    retrievedConfig.endpoint_path,
    rateLimitConfig.endpoint_path,
  );
  TestValidator.equals(
    "HTTP method matches",
    retrievedConfig.http_method,
    rateLimitConfig.http_method,
  );
  TestValidator.equals(
    "rate limit type matches",
    retrievedConfig.rate_limit_type,
    rateLimitConfig.rate_limit_type,
  );
  TestValidator.equals(
    "requests per interval matches",
    retrievedConfig.requests_per_interval,
    rateLimitConfig.requests_per_interval,
  );
  TestValidator.equals(
    "interval seconds matches",
    retrievedConfig.interval_seconds,
    rateLimitConfig.interval_seconds,
  );
  TestValidator.equals(
    "burst limit matches",
    retrievedConfig.burst_limit,
    rateLimitConfig.burst_limit,
  );
  TestValidator.equals(
    "enforcement action matches",
    retrievedConfig.enforcement_action,
    rateLimitConfig.enforcement_action,
  );
  TestValidator.equals(
    "is active matches",
    retrievedConfig.is_active,
    rateLimitConfig.is_active,
  );
  TestValidator.equals(
    "description matches",
    retrievedConfig.description,
    rateLimitConfig.description,
  );
}
