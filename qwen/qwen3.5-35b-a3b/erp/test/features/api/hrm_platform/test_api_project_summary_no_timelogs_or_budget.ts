import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmPlatformDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformDepartment";
import type { IHrmPlatformEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformEmployee";
import type { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import type { IHrmPlatformMemberEmailVerification } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMemberEmailVerification";
import type { IHrmPlatformMemberPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMemberPasswordReset";
import type { IHrmPlatformMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMemberSession";
import type { IHrmPlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganization";
import type { IHrmPlatformProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformProject";
import type { IHrmPlatformProjectMembership } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformProjectMembership";
import type { IHrmPlatformRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformRole";
import type { IHrmPlatformTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformTask";
import type { IHrmPlatformTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformTimelog";
import type { IHrmPlatformTimer } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformTimer";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_hrm_platform_member_projects_create } from "../../../generate/generate_random_hrm_platform_member_projects_create";
import { prepare_random_hrm_platform_project } from "../../../prepare/prepare_random_hrm_platform_project";

/**
 * Test project summary endpoint for a project with no timelogs and no budget hours.
 *
 * Validates that the project summary endpoint correctly handles edge cases where there is
 * no time tracking data or budget allocation defined. Ensures that all aggregated statistics
 * default to zero and that budget utilization is null when budget_hours is not set.
 *
 * Special attention is given to verifying that the summary returns accurate zero values
 * for all time tracking metrics (total_hours, billable_hours, non_billable_hours, timelog_count,
 * employee_count) when no timelogs exist, and that budget_utilization is null when budget_hours
 * is null, preventing division-by-zero errors or incorrect percentage calculations.
 *
 * 1. Create member account with initial organization using authorized member join.
 * 2. Create actor-specific connection from join response for authenticated API calls.
 * 3. Create project without budget_hours field (null) and without creating any timelogs.
 * 4. Call summary endpoint to retrieve project statistics.
 * 5. Validate budget_hours is null as expected from creation input.
 * 6. Verify all numeric aggregations are zero (total_hours, billable_hours, non_billable_hours,
 *    timelog_count, employee_count).
 * 7. Validate budget_utilization is null since budget_hours is null (no calculation possible).
 * 8. Verify created_at and updated_at timestamps are present.
 */
export async function test_api_project_summary_no_timelogs_or_budget(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member account with initial organization
  const joinResult: IHrmPlatformMember.IAuthorized =
    await authorize_member_join(connection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        name: RandomGenerator.name(),
        org_name: RandomGenerator.name(),
        org_currency: RandomGenerator.pick(["USD", "EUR", "KRW"]),
        org_description: RandomGenerator.paragraph({ sentences: 1 }),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IHrmPlatformMember.IJoin,
    });
  typia.assert(joinResult);
  // 2. Create actor-specific connection from join response
  const memberConnection: api.IConnection = { host: connection.host };
  memberConnection.headers = {
    Authorization: joinResult.token.access,
  };
  // 3. Create project without budget_hours and without timelogs
  const project: IHrmPlatformProject =
    await api.functional.hrmPlatform.member.projects.create(memberConnection, {
      body: {
        name: RandomGenerator.name(3),
        color_code: "#FF5733",
        description: RandomGenerator.paragraph({ sentences: 2 }),
      } satisfies IHrmPlatformProject.ICreate,
    });
  typia.assert(project);
  // 4. Call summary endpoint
  const summary: IHrmPlatformProject.ISummary =
    await api.functional.hrmPlatform.member.projects.summary(memberConnection, {
      projectId: project.id,
    });
  typia.assert(summary);
  // 5. Validate budget_hours is null
  TestValidator.equals("budget_hours is null", summary.budget_hours, null);
  // 6. Verify all numeric aggregations are zero
  TestValidator.equals("total_hours is zero", summary.total_hours, 0);
  TestValidator.equals("billable_hours is zero", summary.billable_hours, 0);
  TestValidator.equals(
    "non_billable_hours is zero",
    summary.non_billable_hours,
    0,
  );
  TestValidator.equals("timelog_count is zero", summary.timelog_count, 0);
  TestValidator.equals("employee_count is zero", summary.employee_count, 0);
  // 7. Validate budget_utilization is null (since budget_hours is null)
  TestValidator.equals(
    "budget_utilization is null",
    summary.budget_utilization,
    null,
  );
  // 8. Verify created_at and updated_at timestamps are present
  TestValidator.notEquals("created_at is not empty", summary.created_at, "");
  TestValidator.notEquals("updated_at is not empty", summary.updated_at, "");
}
