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

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { generate_random_discussion_board_admin_api_rate_limits_create } from "../../../generate/generate_random_discussion_board_admin_api_rate_limits_create";
import { prepare_random_discussion_board_api_rate_limit } from "../../../prepare/prepare_random_discussion_board_api_rate_limit";

export async function test_api_api_rate_limit_deletion_by_administrator(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as administrator
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IDiscussionBoardAdmin.IJoin,
  });
  typia.assert(admin);
  // 2. Create a new API rate limit configuration using utility function
  const createdConfig =
    await generate_random_discussion_board_admin_api_rate_limits_create(
      adminConnection,
      {
        body: {
          endpoint_path: "/api/test",
          http_method: "GET",
          rate_limit_type: "ip_based",
          requests_per_interval: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1>
          >(),
          interval_seconds: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1>
          >(),
          burst_limit: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<0>
          >() satisfies number as number | null,
          enforcement_action: "block",
          is_active: true,
          description: RandomGenerator.paragraph({ sentences: 2 }),
        },
      },
    );
  typia.assert(createdConfig);
  // 3. Delete the API rate limit configuration
  await api.functional.discussionBoard.admin.api_rate_limits.erase(
    adminConnection,
    { rateLimitId: createdConfig.id },
  );
  // 4. Verify deletion by attempting to delete the same configuration again
  await TestValidator.error(
    "rate limit should not exist after deletion",
    async () => {
      await api.functional.discussionBoard.admin.api_rate_limits.erase(
        adminConnection,
        { rateLimitId: createdConfig.id },
      );
    },
  );
  // 5. Business logic validation
  TestValidator.predicate(
    "configuration was properly created before deletion",
    createdConfig.endpoint_path === "/api/test" &&
      createdConfig.http_method === "GET",
  );
}
