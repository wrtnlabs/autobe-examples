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

export async function test_api_api_rate_limit_configuration_creation_success(
  connection: api.IConnection,
): Promise<void> {
  // Create admin connection and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IDiscussionBoardAdmin.IJoin,
  });
  // Create rate limit configuration using utility function with random data
  const rateLimit =
    await generate_random_discussion_board_admin_api_rate_limits_create(
      adminConnection,
      {
        body: {
          endpoint_path: "/discussionBoard/user/articles",
          http_method: "POST",
          rate_limit_type: "user_based",
          requests_per_interval: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1>
          >(),
          interval_seconds: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1>
          >(),
          burst_limit: null,
          enforcement_action: "block",
          is_active: true,
          description: null,
        } satisfies IDiscussionBoardApiRateLimit.ICreate,
      },
    );
  typia.assert(rateLimit);
  // Validate business logic only (no type validation after typia.assert)
  TestValidator.predicate("has UUID", rateLimit.id.length > 0);
  TestValidator.predicate(
    "has created_at timestamp",
    rateLimit.created_at.length > 0,
  );
  TestValidator.predicate(
    "has updated_at timestamp",
    rateLimit.updated_at.length > 0,
  );
}
