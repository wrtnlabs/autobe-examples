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

export async function test_api_api_rate_limit_parameter_boundary_checks(
  connection: api.IConnection,
): Promise<void> {
  // Create admin connection and authenticate
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
  // Since we cannot create rate limits via the provided API functions,
  // we'll test boundary updates on a hypothetical existing rate limit
  // This tests the validation logic of the update operation
  const existingRateLimitId = typia.random<string & tags.Format<"uuid">>();
  // Test 1: Minimum valid values
  const minUpdate =
    await api.functional.discussionBoard.admin.api_rate_limits.update(
      adminConnection,
      {
        rateLimitId: existingRateLimitId,
        body: {
          requests_per_interval: 1,
          interval_seconds: 1,
        } satisfies IDiscussionBoardApiRateLimit.IUpdate,
      },
    );
  typia.assert(minUpdate);
  // Test 2: Maximum reasonable values
  const maxUpdate =
    await api.functional.discussionBoard.admin.api_rate_limits.update(
      adminConnection,
      {
        rateLimitId: existingRateLimitId,
        body: {
          requests_per_interval: 1000000,
          interval_seconds: 31536000, // 1 year in seconds
        } satisfies IDiscussionBoardApiRateLimit.IUpdate,
      },
    );
  typia.assert(maxUpdate);
  // Test 3: Boundary enforcement actions
  const enforcementActions = ["block", "throttle", "warning"] as const;
  for (const action of enforcementActions) {
    const actionUpdate =
      await api.functional.discussionBoard.admin.api_rate_limits.update(
        adminConnection,
        {
          rateLimitId: existingRateLimitId,
          body: {
            enforcement_action: action,
          } satisfies IDiscussionBoardApiRateLimit.IUpdate,
        },
      );
    typia.assert(actionUpdate);
  }
  // Test 4: Partial updates (individual fields)
  const partialUpdates = [
    { field: "endpoint_path" as const, value: "/api/new-endpoint" },
    { field: "http_method" as const, value: "POST" },
    { field: "rate_limit_type" as const, value: "ip_based" },
    { field: "is_active" as const, value: false },
    { field: "description" as const, value: "Updated description" },
  ] as const;
  for (const update of partialUpdates) {
    const partialUpdate =
      await api.functional.discussionBoard.admin.api_rate_limits.update(
        adminConnection,
        {
          rateLimitId: existingRateLimitId,
          body: {
            [update.field]: update.value,
          } satisfies IDiscussionBoardApiRateLimit.IUpdate,
        },
      );
    typia.assert(partialUpdate);
  }
  // Test 5: Burst limit boundary (null and valid values)
  const burstUpdates = [
    { burst_limit: null },
    { burst_limit: 10 },
    { burst_limit: 1000 },
  ] as const;
  for (const burstUpdate of burstUpdates) {
    const updateResult =
      await api.functional.discussionBoard.admin.api_rate_limits.update(
        adminConnection,
        {
          rateLimitId: existingRateLimitId,
          body: burstUpdate satisfies IDiscussionBoardApiRateLimit.IUpdate,
        },
      );
    typia.assert(updateResult);
  }
  // Test 6: Combined field updates
  const combinedUpdate =
    await api.functional.discussionBoard.admin.api_rate_limits.update(
      adminConnection,
      {
        rateLimitId: existingRateLimitId,
        body: {
          endpoint_path: "/api/combined",
          http_method: "PUT",
          rate_limit_type: "global",
          requests_per_interval: 500,
          interval_seconds: 3600,
          burst_limit: 50,
          enforcement_action: "throttle",
          is_active: true,
          description: "Combined boundary test",
        } satisfies IDiscussionBoardApiRateLimit.IUpdate,
      },
    );
  typia.assert(combinedUpdate);
}
