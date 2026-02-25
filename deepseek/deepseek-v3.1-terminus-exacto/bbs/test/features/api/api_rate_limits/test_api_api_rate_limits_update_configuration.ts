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

export async function test_api_api_rate_limits_update_configuration(
  connection: api.IConnection,
): Promise<void> {
  // Create super admin connection and authenticate
  const superAdminConnection: api.IConnection = { host: connection.host };
  const authResult = await authorize_super_admin_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IDiscussionBoardSuperAdmin.IJoin,
  });
  typia.assert(authResult);
  // Note: For this test scenario, we need an existing rate limit configuration to update.
  // Assuming there's an existing configuration available in the system (maybe seeded data).
  // In a real test environment, we would create one first. Since no create endpoint is provided,
  // we'll simulate by using a random UUID as the rateLimitId - in actual test, this would be
  // an existing ID from the database.
  const existingRateLimitId = typia.random<string & tags.Format<"uuid">>();
  // Define updated parameters
  const updateBody = {
    requests_per_interval: typia.random<
      number & tags.Type<"int32"> & tags.Minimum<10>
    >(),
    interval_seconds: typia.random<
      number & tags.Type<"int32"> & tags.Minimum<30>
    >(),
    burst_limit: typia.random<
      number & tags.Type<"int32"> & tags.Minimum<5>
    >() as number | null,
    enforcement_action: RandomGenerator.pick([
      "block",
      "throttle",
      "warning",
    ] as const),
    description: RandomGenerator.paragraph({ sentences: 2 }),
    is_active: true,
  } satisfies IDiscussionBoardApiRateLimit.IUpdate;
  // Update the rate limit configuration
  const updatedConfig =
    await api.functional.discussionBoard.superAdmin.api_rate_limits.update(
      superAdminConnection,
      {
        rateLimitId: existingRateLimitId,
        body: updateBody,
      },
    );
  typia.assert(updatedConfig);
  // Validate that updated fields match the new values
  if (updateBody.requests_per_interval !== undefined) {
    TestValidator.equals(
      "requests_per_interval updated",
      updatedConfig.requests_per_interval,
      updateBody.requests_per_interval,
    );
  }
  if (updateBody.interval_seconds !== undefined) {
    TestValidator.equals(
      "interval_seconds updated",
      updatedConfig.interval_seconds,
      updateBody.interval_seconds,
    );
  }
  if (updateBody.burst_limit !== undefined) {
    TestValidator.equals(
      "burst_limit updated",
      updatedConfig.burst_limit,
      updateBody.burst_limit,
    );
  }
  if (updateBody.enforcement_action !== undefined) {
    TestValidator.equals(
      "enforcement_action updated",
      updatedConfig.enforcement_action,
      updateBody.enforcement_action,
    );
  }
  if (updateBody.description !== undefined) {
    TestValidator.equals(
      "description updated",
      updatedConfig.description,
      updateBody.description,
    );
  }
  if (updateBody.is_active !== undefined) {
    TestValidator.equals(
      "is_active updated",
      updatedConfig.is_active,
      updateBody.is_active,
    );
  }
  // Validate that enforcement counters are reset
  TestValidator.equals(
    "enforcement_count reset to 0",
    updatedConfig.enforcement_count,
    0,
  );
  TestValidator.equals(
    "enforced_at reset to null",
    updatedConfig.enforced_at,
    null,
  );
  // Validate that non-updated fields retain their values (we can only check that they exist)
  TestValidator.predicate("id exists", updatedConfig.id !== undefined);
  TestValidator.predicate(
    "endpoint_path exists",
    updatedConfig.endpoint_path !== undefined,
  );
  TestValidator.predicate(
    "http_method exists",
    updatedConfig.http_method !== undefined,
  );
  TestValidator.predicate(
    "rate_limit_type exists",
    updatedConfig.rate_limit_type !== undefined,
  );
  TestValidator.predicate(
    "created_at exists",
    updatedConfig.created_at !== undefined,
  );
  TestValidator.predicate(
    "updated_at exists",
    updatedConfig.updated_at !== undefined,
  );
}
