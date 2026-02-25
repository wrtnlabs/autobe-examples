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

import { authorize_super_admin_join } from "../../../authorize/authorize_super_admin_join";
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";
import { generate_random_discussion_board_super_admin_api_rate_limits_create } from "../../../generate/generate_random_discussion_board_super_admin_api_rate_limits_create";
import { prepare_random_discussion_board_api_rate_limit } from "../../../prepare/prepare_random_discussion_board_api_rate_limit";

export async function test_api_api_rate_limit_configuration_complex_policy(
  connection: api.IConnection,
): Promise<void> {
  // Create super admin connection
  const superAdminConnection: api.IConnection = { host: connection.host };
  await authorize_super_admin_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IDiscussionBoardSuperAdmin.IJoin,
  });
  // Test 1: Complex policy with burst limit and description
  const complexPolicy =
    await generate_random_discussion_board_super_admin_api_rate_limits_create(
      superAdminConnection,
      {
        body: {
          endpoint_path: "/api/articles",
          http_method: "POST",
          rate_limit_type: "ip_based",
          requests_per_interval: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1>
          >() satisfies number as number,
          interval_seconds: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1>
          >() satisfies number as number,
          burst_limit: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<0>
          >() satisfies number as number,
          enforcement_action: "block",
          is_active: true,
          description: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies IDiscussionBoardApiRateLimit.ICreate,
      },
    );
  typia.assert(complexPolicy);
  // Test 2: User-based rate limit with throttle action
  const userBasedPolicy =
    await generate_random_discussion_board_super_admin_api_rate_limits_create(
      superAdminConnection,
      {
        body: {
          endpoint_path: "/api/comments",
          http_method: "POST",
          rate_limit_type: "user_based",
          requests_per_interval: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1>
          >() satisfies number as number,
          interval_seconds: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1>
          >() satisfies number as number,
          burst_limit: null,
          enforcement_action: "throttle",
          is_active: true,
          description: null,
        } satisfies IDiscussionBoardApiRateLimit.ICreate,
      },
    );
  typia.assert(userBasedPolicy);
  // Test 3: Global rate limit with warning action
  const globalPolicy =
    await generate_random_discussion_board_super_admin_api_rate_limits_create(
      superAdminConnection,
      {
        body: {
          endpoint_path: "/api/search",
          http_method: "GET",
          rate_limit_type: "global",
          requests_per_interval: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1>
          >() satisfies number as number,
          interval_seconds: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1>
          >() satisfies number as number,
          burst_limit: undefined,
          enforcement_action: "warning",
          is_active: false,
          description: RandomGenerator.paragraph({ sentences: 1 }),
        } satisfies IDiscussionBoardApiRateLimit.ICreate,
      },
    );
  typia.assert(globalPolicy);
  // Test 4: Boundary case - minimum values
  const minPolicy =
    await generate_random_discussion_board_super_admin_api_rate_limits_create(
      superAdminConnection,
      {
        body: {
          endpoint_path: "/api/users",
          http_method: "GET",
          rate_limit_type: "ip_based",
          requests_per_interval: 1 satisfies number as number,
          interval_seconds: 1 satisfies number as number,
          burst_limit: 0 satisfies number as number,
          enforcement_action: "block",
          is_active: true,
          description: "Minimum values test",
        } satisfies IDiscussionBoardApiRateLimit.ICreate,
      },
    );
  typia.assert(minPolicy);
  // Validate that all policies were created successfully
  TestValidator.equals(
    "complex policy has burst limit",
    complexPolicy.burst_limit !== null,
    true,
  );
  TestValidator.equals(
    "complex policy has description",
    complexPolicy.description !== null,
    true,
  );
  TestValidator.equals(
    "user based policy has null burst limit",
    userBasedPolicy.burst_limit,
    null,
  );
  TestValidator.equals(
    "user based policy has null description",
    userBasedPolicy.description,
    null,
  );
  TestValidator.equals(
    "global policy has undefined burst limit",
    globalPolicy.burst_limit,
    undefined,
  );
  TestValidator.equals(
    "min policy has burst limit 0",
    minPolicy.burst_limit,
    0,
  );
  TestValidator.equals(
    "min policy requests per interval is 1",
    minPolicy.requests_per_interval,
    1,
  );
  TestValidator.equals(
    "min policy interval seconds is 1",
    minPolicy.interval_seconds,
    1,
  );
}
