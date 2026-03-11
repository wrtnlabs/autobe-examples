import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuperAdmin";
import type { IDiscussionBoardSystemHealthMetric } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSystemHealthMetric";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_admin_join } from "../../../authorize/authorize_super_admin_join";
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";

/**
 * Validate that the health endpoint properly enforces super administrator authentication requirements.
 * Tests security boundary by verifying unauthorized access is rejected and authenticated access succeeds.
 */
export async function test_api_system_health_authentication_required(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Attempt unauthorized access to health endpoint using unauthenticated connection
  const unauthorizedConnection: api.IConnection = { host: connection.host };
  // Test that unauthorized access results in appropriate business error
  await TestValidator.error(
    "health endpoint requires super admin authentication",
    async () => {
      await api.functional.discussionBoard.superAdmin.health.at(
        unauthorizedConnection,
      );
    },
  );
  // Step 2: Create super administrator account using utility function
  const superAdminConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_super_admin_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IDiscussionBoardSuperAdmin.IJoin,
  });
  typia.assert(authorized);
  // Step 3: Call health endpoint with proper authentication
  const healthMetrics =
    await api.functional.discussionBoard.superAdmin.health.at(
      superAdminConnection,
    );
  typia.assert(healthMetrics);
  // Step 4: Validate business logic - health metrics should contain meaningful data
  // The typia.assert() above already performs complete validation of all properties
  TestValidator.predicate(
    "health data is accessible to authenticated super admin",
    healthMetrics.metric_type.length > 0 &&
      healthMetrics.source_service.length > 0,
  );
}
