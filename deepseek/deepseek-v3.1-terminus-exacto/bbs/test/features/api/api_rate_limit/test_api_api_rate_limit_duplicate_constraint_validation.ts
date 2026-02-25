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

export async function test_api_api_rate_limit_duplicate_constraint_validation(
  connection: api.IConnection,
): Promise<void> {
  // Create administrator connection
  const adminConnection: api.IConnection = { host: connection.host };
  // Authenticate as administrator
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
  // Create initial rate limit configuration
  const initialConfig: IDiscussionBoardApiRateLimit.ICreate = {
    endpoint_path: "/api/articles",
    http_method: "GET",
    rate_limit_type: "ip_based",
    requests_per_interval: typia.random<
      number & tags.Type<"int32"> & tags.Minimum<1>
    >(),
    interval_seconds: typia.random<
      number & tags.Type<"int32"> & tags.Minimum<1>
    >(),
    burst_limit: typia.random<number & tags.Type<"int32"> & tags.Minimum<0>>(),
    enforcement_action: "block",
    is_active: true,
    description: "Rate limit for article retrieval",
  };
  const createdRateLimit =
    await api.functional.discussionBoard.admin.api_rate_limits.create(
      adminConnection,
      { body: initialConfig },
    );
  typia.assert(createdRateLimit);
  // Attempt to create duplicate configuration
  const duplicateConfig: IDiscussionBoardApiRateLimit.ICreate = {
    ...initialConfig,
    requests_per_interval: typia.random<
      number & tags.Type<"int32"> & tags.Minimum<1>
    >(),
    interval_seconds: typia.random<
      number & tags.Type<"int32"> & tags.Minimum<1>
    >(),
    description: "Duplicate rate limit configuration",
  };
  await TestValidator.error("duplicate rate limit configuration", async () => {
    await api.functional.discussionBoard.admin.api_rate_limits.create(
      adminConnection,
      { body: duplicateConfig },
    );
  });
  // Verify initial configuration still exists and is unchanged
  TestValidator.equals(
    "endpoint_path matches",
    createdRateLimit.endpoint_path,
    initialConfig.endpoint_path,
  );
  TestValidator.equals(
    "http_method matches",
    createdRateLimit.http_method,
    initialConfig.http_method,
  );
  TestValidator.equals(
    "rate_limit_type matches",
    createdRateLimit.rate_limit_type,
    initialConfig.rate_limit_type,
  );
}
