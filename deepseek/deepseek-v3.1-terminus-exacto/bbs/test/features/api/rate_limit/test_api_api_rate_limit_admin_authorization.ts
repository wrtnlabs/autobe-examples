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

export async function test_api_api_rate_limit_admin_authorization(
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
  // Create a rate limit configuration to update
  const rateLimitId = typia.random<string & tags.Format<"uuid">>();
  // Update rate limit configuration with admin authorization
  const updateData: IDiscussionBoardApiRateLimit.IUpdate = {
    endpoint_path: "/api/test",
    http_method: "GET",
    rate_limit_type: "ip_based",
    requests_per_interval: typia.random<
      number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<1000>
    >(),
    interval_seconds: typia.random<
      number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<3600>
    >(),
    burst_limit: typia.random<
      number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<100>
    >(),
    enforcement_action: "block",
    is_active: true,
    description: "Test rate limit configuration",
  };
  const updatedRateLimit =
    await api.functional.discussionBoard.admin.api_rate_limits.update(
      adminConnection,
      {
        rateLimitId,
        body: updateData,
      },
    );
  typia.assert(updatedRateLimit);
  // Verify the update was successful
  TestValidator.equals(
    "endpoint path updated",
    updatedRateLimit.endpoint_path,
    updateData.endpoint_path,
  );
  TestValidator.equals(
    "http method updated",
    updatedRateLimit.http_method,
    updateData.http_method,
  );
  TestValidator.equals(
    "rate limit type updated",
    updatedRateLimit.rate_limit_type,
    updateData.rate_limit_type,
  );
  TestValidator.equals(
    "requests per interval updated",
    updatedRateLimit.requests_per_interval,
    updateData.requests_per_interval,
  );
  TestValidator.equals(
    "interval seconds updated",
    updatedRateLimit.interval_seconds,
    updateData.interval_seconds,
  );
  TestValidator.equals(
    "burst limit updated",
    updatedRateLimit.burst_limit,
    updateData.burst_limit,
  );
  TestValidator.equals(
    "enforcement action updated",
    updatedRateLimit.enforcement_action,
    updateData.enforcement_action,
  );
  TestValidator.equals(
    "is active updated",
    updatedRateLimit.is_active,
    updateData.is_active,
  );
  TestValidator.equals(
    "description updated",
    updatedRateLimit.description,
    updateData.description,
  );
  // Test unauthorized access - attempt to update without admin credentials
  const unauthorizedConnection: api.IConnection = { host: connection.host };
  await TestValidator.error("unauthorized access should fail", async () => {
    await api.functional.discussionBoard.admin.api_rate_limits.update(
      unauthorizedConnection,
      {
        rateLimitId,
        body: updateData,
      },
    );
  });
}
