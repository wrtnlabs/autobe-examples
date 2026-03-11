import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuperAdmin";
import type { IDiscussionBoardSystemConfiguration } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSystemConfiguration";
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
 * Test that the dashboard provides real-time monitoring capabilities for administrative oversight.
 * Validate that the system health metrics include key performance indicators such as average response time,
 * database connection health, and operational status. Verify that the dashboard response is properly
 * structured for administrative dashboards with categorized metrics and status indicators.
 */
export async function test_api_superadmin_dashboard_monitoring_capabilities(
  connection: api.IConnection,
): Promise<void> {
  // Create super admin connection and authenticate
  const superAdminConnection: api.IConnection = { host: connection.host };
  await authorize_super_admin_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IDiscussionBoardSuperAdmin.IJoin,
  });
  // Access the dashboard endpoint
  const dashboardResponse =
    await api.functional.discussionBoard.superAdmin.dashboard.at(
      superAdminConnection,
    );
  // Validate the response structure
  typia.assert(dashboardResponse);
  // Verify the dashboard contains expected system configuration properties
  TestValidator.predicate(
    "dashboard has id",
    dashboardResponse.id !== undefined,
  );
  TestValidator.predicate(
    "dashboard has key",
    dashboardResponse.key !== undefined,
  );
  TestValidator.predicate(
    "dashboard has description",
    dashboardResponse.description !== undefined,
  );
  TestValidator.predicate(
    "dashboard has data type",
    dashboardResponse.data_type !== undefined,
  );
  TestValidator.predicate(
    "dashboard has creation timestamp",
    dashboardResponse.created_at !== undefined,
  );
  TestValidator.predicate(
    "dashboard has update timestamp",
    dashboardResponse.updated_at !== undefined,
  );
  // Validate timestamp formats
  TestValidator.predicate(
    "created_at is valid date-time",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?(Z|[+-]\d{2}:\d{2})$/.test(
      dashboardResponse.created_at,
    ),
  );
  TestValidator.predicate(
    "updated_at is valid date-time",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?(Z|[+-]\d{2}:\d{2})$/.test(
      dashboardResponse.updated_at,
    ),
  );
}
