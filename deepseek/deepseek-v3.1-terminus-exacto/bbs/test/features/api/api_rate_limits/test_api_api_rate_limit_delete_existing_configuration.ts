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

export async function test_api_api_rate_limit_delete_existing_configuration(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as super administrator
  const superAdminConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_super_admin_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(authorized);
  // 2. Create a rate limit configuration to delete
  const rateLimitConfig =
    await generate_random_discussion_board_super_admin_api_rate_limits_create(
      superAdminConnection,
      {
        body: {
          endpoint_path: "/api/test",
          http_method: "GET",
          rate_limit_type: "ip_based",
          requests_per_interval: typia.random<
            number & tags.Type<"uint32"> & tags.Minimum<1>
          >(),
          interval_seconds: typia.random<
            number & tags.Type<"uint32"> & tags.Minimum<1>
          >(),
          enforcement_action: "block",
          is_active: true,
          description: RandomGenerator.paragraph({ sentences: 2 }),
        },
      },
    );
  typia.assert(rateLimitConfig);
  // Validate the created configuration has expected fields
  TestValidator.predicate(
    "rate limit config has id",
    rateLimitConfig.id !== undefined,
  );
  TestValidator.equals(
    "endpoint path matches",
    rateLimitConfig.endpoint_path,
    "/api/test",
  );
  TestValidator.equals(
    "http method matches",
    rateLimitConfig.http_method,
    "GET",
  );
  // 3. Delete the rate limit configuration
  await api.functional.discussionBoard.superAdmin.api_rate_limits.erase(
    superAdminConnection,
    {
      rateLimitId: rateLimitConfig.id,
    },
  );
  // 4. Verify deletion by attempting to delete again (should fail with 404)
  await TestValidator.httpError(
    "should throw 404 when deleting non-existent rate limit",
    404,
    async () => {
      await api.functional.discussionBoard.superAdmin.api_rate_limits.erase(
        superAdminConnection,
        {
          rateLimitId: rateLimitConfig.id,
        },
      );
    },
  );
}
