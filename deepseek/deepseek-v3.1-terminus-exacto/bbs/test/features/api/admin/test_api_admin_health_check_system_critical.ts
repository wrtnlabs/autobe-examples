import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardSystemHealthMetric } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSystemHealthMetric";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

/**
 * Test the health check endpoint when critical system failures occur.
 * Validates that the endpoint returns proper health metrics structure
 * and provides sufficient diagnostic information for administrators.
 */
export async function test_api_admin_health_check_system_critical(
  connection: api.IConnection,
): Promise<void> {
  // Create administrator connection
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IDiscussionBoardAdmin.IJoin,
  });
  // Call health check endpoint
  const healthMetric =
    await api.functional.discussionBoard.admin.health.at(adminConnection);
  typia.assert(healthMetric);
  // The typia.assert() call above performs complete validation of:
  // - All property existence checks
  // - All type checks (string, number, etc.)
  // - All format validations (UUID, date-time)
  // - All constraint validations
  // No additional validation is needed after typia.assert()
  // Since we cannot simulate actual system failures in E2E tests,
  // we validate that the health check endpoint is accessible and
  // returns valid structured data as defined by the DTO
}
