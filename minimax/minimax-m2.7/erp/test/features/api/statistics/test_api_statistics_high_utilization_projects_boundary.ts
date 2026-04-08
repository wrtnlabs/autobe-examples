import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmAdmin";
import type { IErpHrmDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmDepartment";
import type { IErpHrmEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmEmployee";
import type { IErpHrmInvitation } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmInvitation";
import type { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
import type { IErpHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmOrganization";
import type { IErpHrmProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmProject";
import type { IErpHrmProjectMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmProjectMember";
import type { IErpHrmRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmRole";
import type { IErpHrmStatistic } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmStatistic";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { generate_random_erp_hrm_admin_employees_create } from "../../../generate/generate_random_erp_hrm_admin_employees_create";
import { generate_random_erp_hrm_admin_projects_create } from "../../../generate/generate_random_erp_hrm_admin_projects_create";
import { generate_random_erp_hrm_admin_projects_members_create } from "../../../generate/generate_random_erp_hrm_admin_projects_members_create";
import { prepare_random_erp_hrm_employee } from "../../../prepare/prepare_random_erp_hrm_employee";
import { prepare_random_erp_hrm_project } from "../../../prepare/prepare_random_erp_hrm_project";
import { prepare_random_erp_hrm_project_member } from "../../../prepare/prepare_random_erp_hrm_project_member";

export async function test_api_statistics_high_utilization_projects_boundary(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as admin with report:view permission (owner has all permissions)
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      displayName: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IErpHrmAdmin.IJoin,
  });
  // 2. Create multiple projects with different budget hours for boundary testing
  // Note: Full boundary testing (79%, 80%, 85%, 100%) requires timelog creation
  // which is not available in this SDK. We test the endpoint structure and
  // verify that projects with 0% utilization (no timelogs) do NOT appear.
  const project1 = await generate_random_erp_hrm_admin_projects_create(
    adminConnection,
    {
      body: {
        name: "High Budget Project 1",
        color: "#FF5733",
        budgetHours: 100,
        status: "active",
      } satisfies IErpHrmProject.ICreate,
    },
  );
  typia.assert(project1);
  const project2 = await generate_random_erp_hrm_admin_projects_create(
    adminConnection,
    {
      body: {
        name: "High Budget Project 2",
        color: "#4A90E2",
        budgetHours: 200,
        status: "active",
      } satisfies IErpHrmProject.ICreate,
    },
  );
  typia.assert(project2);
  const project3 = await generate_random_erp_hrm_admin_projects_create(
    adminConnection,
    {
      body: {
        name: "High Budget Project 3",
        color: "#28A745",
        budgetHours: 50,
        status: "active",
      } satisfies IErpHrmProject.ICreate,
    },
  );
  typia.assert(project3);
  // 3. Create employee for potential future timelog testing
  await generate_random_erp_hrm_admin_employees_create(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      roleId: typia.random<string & tags.Format<"uuid">>(),
      employmentType: "full-time",
    },
  });
  // 4. Call statistics overview endpoint
  const stats =
    await api.functional.erpHrm.admin.statistics.overview(adminConnection);
  typia.assert(stats);
  // 5. Validate response structure
  TestValidator.predicate(
    "employees_count is non-negative",
    stats.employees_count >= 0,
  );
  TestValidator.predicate(
    "weekly_hours is non-negative",
    stats.weekly_hours >= 0,
  );
  TestValidator.predicate(
    "pending_timesheets_count is non-negative",
    stats.pending_timesheets_count >= 0,
  );
  // 6. Validate high_utilization_projects array
  TestValidator.predicate(
    "high_utilization_projects is array",
    Array.isArray(stats.high_utilization_projects),
  );
  // 7. Validate max 10 projects returned (boundary condition)
  TestValidator.predicate(
    "max 10 high utilization projects",
    stats.high_utilization_projects.length <= 10,
  );
  // 8. Validate projects are sorted by utilization_percentage descending
  for (let i = 1; i < stats.high_utilization_projects.length; i++) {
    TestValidator.predicate(
      `project[${i - 1}] utilization >= project[${i}] utilization`,
      stats.high_utilization_projects[i - 1].utilization_percentage >=
        stats.high_utilization_projects[i].utilization_percentage,
    );
  }
  // 9. Validate ALL projects have >= 80% utilization (the boundary condition)
  for (const project of stats.high_utilization_projects) {
    TestValidator.predicate(
      `project ${project.name} has utilization >= 80%`,
      project.utilization_percentage >= 80,
    );
  }
  // 10. Validate project entry structure
  for (const project of stats.high_utilization_projects) {
    TestValidator.predicate(
      "project has name",
      typeof project.name === "string" && project.name.length > 0,
    );
    TestValidator.predicate(
      "project has color",
      typeof project.color === "string" && project.color.length > 0,
    );
    TestValidator.predicate(
      "project has budget_hours",
      typeof project.budget_hours === "number" && project.budget_hours > 0,
    );
    TestValidator.predicate(
      "project has utilization_percentage",
      typeof project.utilization_percentage === "number",
    );
  }
  // 11. With no timelogs created, high_utilization_projects should be empty
  // This validates the 80% boundary is respected (0% < 80%)
  TestValidator.equals(
    "no high utilization projects without timelogs",
    stats.high_utilization_projects.length,
    0,
  );
}
