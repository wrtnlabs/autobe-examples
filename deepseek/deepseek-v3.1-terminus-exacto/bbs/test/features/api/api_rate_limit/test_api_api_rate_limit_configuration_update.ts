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

export async function test_api_api_rate_limit_configuration_update(
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
  // Since there's no utility function for creating rate limit configurations,
  // we need to use the update endpoint with an existing configuration ID
  // For this test, we'll assume there's a pre-existing configuration we can update
  const existingRateLimitId = typia.random<string & tags.Format<"uuid">>();
  // Update the configuration with new values
  const updateBody = {
    endpoint_path: "/api/updated",
    http_method: "POST",
    rate_limit_type: "user_based",
    requests_per_interval: typia.random<
      number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<50>
    >(),
    interval_seconds: typia.random<
      number & tags.Type<"int32"> & tags.Minimum<300> & tags.Maximum<7200>
    >(),
    burst_limit: typia.random<
      number & tags.Type<"int32"> & tags.Minimum<5> & tags.Maximum<100>
    >(),
    enforcement_action: "throttle",
    is_active: true,
    description: RandomGenerator.paragraph({ sentences: 3 }),
  } satisfies IDiscussionBoardApiRateLimit.IUpdate;
  const updatedConfig =
    await api.functional.discussionBoard.admin.api_rate_limits.update(
      adminConnection,
      {
        rateLimitId: existingRateLimitId,
        body: updateBody,
      },
    );
  typia.assert(updatedConfig);
  // Verify the updated configuration matches the input
  TestValidator.equals(
    "endpoint path matches",
    updatedConfig.endpoint_path,
    updateBody.endpoint_path,
  );
  TestValidator.equals(
    "http method matches",
    updatedConfig.http_method,
    updateBody.http_method,
  );
  TestValidator.equals(
    "rate limit type matches",
    updatedConfig.rate_limit_type,
    updateBody.rate_limit_type,
  );
  TestValidator.equals(
    "requests per interval matches",
    updatedConfig.requests_per_interval,
    updateBody.requests_per_interval,
  );
  TestValidator.equals(
    "interval seconds matches",
    updatedConfig.interval_seconds,
    updateBody.interval_seconds,
  );
  TestValidator.equals(
    "burst limit matches",
    updatedConfig.burst_limit,
    updateBody.burst_limit,
  );
  TestValidator.equals(
    "enforcement action matches",
    updatedConfig.enforcement_action,
    updateBody.enforcement_action,
  );
  TestValidator.predicate("is active", updatedConfig.is_active);
  TestValidator.equals(
    "description matches",
    updatedConfig.description,
    updateBody.description,
  );
  // Verify that the configuration has proper audit fields
  TestValidator.predicate("has valid UUID", updatedConfig.id.length > 0);
  TestValidator.predicate(
    "has creation timestamp",
    updatedConfig.created_at.length > 0,
  );
  TestValidator.predicate(
    "has update timestamp",
    updatedConfig.updated_at.length > 0,
  );
  TestValidator.equals("not deleted", updatedConfig.deleted_at, null);
}
