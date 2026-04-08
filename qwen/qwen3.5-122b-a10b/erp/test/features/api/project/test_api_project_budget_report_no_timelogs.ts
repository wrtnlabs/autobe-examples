import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmMember";
import type { IHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmOrganization";
import type { IHrmProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmProject";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

/**
 * Test project budget report endpoint with no timelogs recorded.
 *
 * Validates the budget report endpoint returns correct values when a project has budget hours allocated but no timelogs exist. This ensures the system correctly handles the zero-timelog edge case and calculates percentage consumed as 0%.
 *
 * The test verifies that actualHours is 0 and percentageConsumed is 0% when no time has been logged to the project, while budgetHours reflects the configured project budget.
 *
 * 1. Register a new member account with email and password.
 * 2. Call the budget report endpoint with organization ID and project ID.
 * 3. Validate actualHours equals 0 when no timelogs exist.
 * 4. Validate percentageConsumed equals 0% when actual hours is 0.
 * 5. Validate budgetHours is a positive number from project configuration.
 */
export async function test_api_project_budget_report_no_timelogs(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a new member account
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IHrmMember.IJoin,
  });
  typia.assert(memberAuth);
  // 2. Call the budget report endpoint with organizationId and projectId
  // Note: Organization and project creation APIs are not available in the provided SDK.
  // In a real test environment, these resources would need to be created first.
  const organizationId = typia.random<string & tags.Format<"uuid">>();
  const projectId = typia.random<string & tags.Format<"uuid">>();
  const budgetReport =
    await api.functional.hrm.member.organizations.projects.budget_report.budgetReport(
      memberConnection,
      {
        organizationId,
        projectId,
      },
    );
  typia.assert(budgetReport);
  // 3. Validate the response structure and zero-timelog edge case
  TestValidator.equals(
    "actual hours should be 0 when no timelogs exist",
    budgetReport.actualHours,
    0,
  );
  TestValidator.equals(
    "percentage consumed should be 0 when actual hours is 0",
    budgetReport.percentageConsumed,
    0,
  );
  TestValidator.predicate(
    "budget hours should be a positive number",
    budgetReport.budgetHours > 0,
  );
}
