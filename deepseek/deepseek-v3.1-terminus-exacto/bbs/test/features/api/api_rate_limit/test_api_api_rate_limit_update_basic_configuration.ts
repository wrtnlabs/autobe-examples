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

import { authorize_super_admin_join } from "../../../authorize/authorize_super_admin_join";
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";

export async function test_api_api_rate_limit_update_basic_configuration(
  connection: api.IConnection,
): Promise<void> {
  // Create super administrator connection
  const superAdminConnection: api.IConnection = { host: connection.host };
  const superAdmin = await authorize_super_admin_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      privilege_level: "super_admin",
    } satisfies IDiscussionBoardSuperAdmin.IJoin,
  });
  typia.assert(superAdmin);
  // Since we cannot create a rate limit (no CREATE endpoint provided),
  // we need to use a pre-existing rate limit ID for testing
  // Generate a random UUID that would represent an existing rate limit
  const existingRateLimitId = typia.random<string & tags.Format<"uuid">>();
  // Prepare update data with new values
  const updateData = {
    endpoint_path: "/api/updated",
    http_method: "POST",
    rate_limit_type: "user_based",
    requests_per_interval: typia.random<
      number & tags.Type<"int32"> & tags.Minimum<1>
    >(),
    interval_seconds: typia.random<
      number & tags.Type<"int32"> & tags.Minimum<1>
    >(),
    burst_limit: typia.random<number & tags.Type<"int32"> & tags.Minimum<0>>(),
    enforcement_action: "throttle",
    is_active: false,
    description: "Updated rate limit configuration",
  } satisfies IDiscussionBoardApiRateLimit.IUpdate;
  // Update the rate limit configuration
  const updatedRateLimit =
    await api.functional.discussionBoard.superAdmin.api_rate_limits.update(
      superAdminConnection,
      {
        rateLimitId: existingRateLimitId,
        body: updateData,
      },
    );
  typia.assert(updatedRateLimit);
  // Validate updated values
  TestValidator.equals(
    "endpoint_path updated",
    updatedRateLimit.endpoint_path,
    updateData.endpoint_path,
  );
  TestValidator.equals(
    "http_method updated",
    updatedRateLimit.http_method,
    updateData.http_method,
  );
  TestValidator.equals(
    "rate_limit_type updated",
    updatedRateLimit.rate_limit_type,
    updateData.rate_limit_type,
  );
  TestValidator.equals(
    "requests_per_interval updated",
    updatedRateLimit.requests_per_interval,
    updateData.requests_per_interval,
  );
  TestValidator.equals(
    "interval_seconds updated",
    updatedRateLimit.interval_seconds,
    updateData.interval_seconds,
  );
  TestValidator.equals(
    "burst_limit updated",
    updatedRateLimit.burst_limit,
    updateData.burst_limit,
  );
  TestValidator.equals(
    "enforcement_action updated",
    updatedRateLimit.enforcement_action,
    updateData.enforcement_action,
  );
  TestValidator.equals(
    "is_active updated",
    updatedRateLimit.is_active,
    updateData.is_active,
  );
  TestValidator.equals(
    "description updated",
    updatedRateLimit.description,
    updateData.description,
  );
  // Validate that enforcement tracking fields exist
  TestValidator.predicate(
    "enforcement_count exists",
    typeof updatedRateLimit.enforcement_count === "number",
  );
  TestValidator.predicate(
    "enforced_at exists",
    updatedRateLimit.enforced_at === null ||
      typeof updatedRateLimit.enforced_at === "string",
  );
  // Validate basic structure
  TestValidator.predicate(
    "has valid id",
    /^[0-9a-f-]{36}$/i.test(updatedRateLimit.id),
  );
  TestValidator.predicate(
    "created_at is valid date",
    !isNaN(new Date(updatedRateLimit.created_at).getTime()),
  );
  TestValidator.predicate(
    "updated_at is valid date",
    !isNaN(new Date(updatedRateLimit.updated_at).getTime()),
  );
}
