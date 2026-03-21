import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmDepartment";
import type { IErpHrmEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmEmployee";
import type { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
import type { IErpHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmOrganization";
import type { IErpHrmOrganizationDashboard } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmOrganizationDashboard";
import type { IErpHrmProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmProject";
import type { IErpHrmRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmRole";
import type { IErpHrmTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTask";
import type { IErpHrmTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimelog";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_erp_hrm_member_projects_create } from "../../../generate/generate_random_erp_hrm_member_projects_create";
import { generate_random_erp_hrm_member_timelogs_create } from "../../../generate/generate_random_erp_hrm_member_timelogs_create";
import { prepare_random_erp_hrm_project } from "../../../prepare/prepare_random_erp_hrm_project";
import { prepare_random_erp_hrm_timelog } from "../../../prepare/prepare_random_erp_hrm_timelog";

export async function test_api_organization_dashboard_budget_alert_threshold(
  connection: api.IConnection,
): Promise<void> {
  // 1. Member joins and creates organization
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      password: RandomGenerator.alphaNumeric(16),
      displayName: RandomGenerator.name(),
    },
  });
  typia.assert(member);
  // 2. Create project A with small budget (10 hours) - will exceed 80%
  const projectA = await generate_random_erp_hrm_member_projects_create(
    memberConnection,
    {
      body: {
        name: `Project-A-${RandomGenerator.alphabets(6)}`,
        color_code: "#FF5733",
        budget_hours: 10,
      },
    },
  );
  typia.assert(projectA);
  // 3. Create project B with large budget - will stay below 80%
  const projectB = await generate_random_erp_hrm_member_projects_create(
    memberConnection,
    {
      body: {
        name: `Project-B-${RandomGenerator.alphabets(6)}`,
        color_code: "#33FF57",
        budget_hours: 100,
      },
    },
  );
  typia.assert(projectB);
  // 4. Create project C without budget - should be excluded from alerts
  const projectC = await generate_random_erp_hrm_member_projects_create(
    memberConnection,
    {
      body: {
        name: `Project-C-${RandomGenerator.alphabets(6)}`,
        color_code: "#5733FF",
      },
    },
  );
  typia.assert(projectC);
  // 5. Log time against project A: 500 minutes = 8.33 hours (> 80% of 10 hours)
  // This results in 83.3% utilization - should trigger alert
  const timelogA1 = await generate_random_erp_hrm_member_timelogs_create(
    memberConnection,
    {
      body: {
        project_id: projectA.id,
        date: new Date().toISOString(),
        duration: 300,
        description: RandomGenerator.paragraph({ sentences: 2 }),
      },
    },
  );
  typia.assert(timelogA1);
  const timelogA2 = await generate_random_erp_hrm_member_timelogs_create(
    memberConnection,
    {
      body: {
        project_id: projectA.id,
        date: new Date().toISOString(),
        duration: 200,
        description: RandomGenerator.paragraph({ sentences: 2 }),
      },
    },
  );
  typia.assert(timelogA2);
  // 6. Log time against project B: 60 minutes = 1 hour (< 80% of 100 hours)
  // This results in 1% utilization - should NOT trigger alert
  const timelogB = await generate_random_erp_hrm_member_timelogs_create(
    memberConnection,
    {
      body: {
        project_id: projectB.id,
        date: new Date().toISOString(),
        duration: 60,
        description: RandomGenerator.paragraph({ sentences: 2 }),
      },
    },
  );
  typia.assert(timelogB);
  // 7. Log time against project C (no budget) - should be excluded from alerts
  const timelogC = await generate_random_erp_hrm_member_timelogs_create(
    memberConnection,
    {
      body: {
        project_id: projectC.id,
        date: new Date().toISOString(),
        duration: 120,
        description: RandomGenerator.paragraph({ sentences: 2 }),
      },
    },
  );
  typia.assert(timelogC);
  // 8. Fetch organization dashboard
  const dashboard =
    await api.functional.erpHrm.member.dashboards.organization.at(
      memberConnection,
    );
  typia.assert(dashboard);
  // 9. Validate budget_alerts
  TestValidator.predicate(
    "budget_alerts should be an array",
    Array.isArray(dashboard.budget_alerts),
  );
  // 10. Find alert for project A
  const projectAAlert = dashboard.budget_alerts.find(
    (alert) => alert.project_id === projectA.id,
  );
  // Project A should be in budget_alerts (83.3% utilization > 80%)
  TestValidator.predicate(
    "Project A should appear in budget_alerts",
    projectAAlert !== undefined,
  );
  if (projectAAlert !== null) {
    TestValidator.equals(
      "project_name should match",
      projectAAlert!.project_name,
      projectA.name,
    );
    TestValidator.equals(
      "budget_hours should match",
      projectAAlert!.budget_hours,
      10,
    );
    // actual_hours should be 500/60 + 200/60 = 8.33 hours
    TestValidator.predicate(
      "actual_hours should be approximately 8.33",
      projectAAlert!.actual_hours >= 8 && projectAAlert!.actual_hours <= 9,
    );
    TestValidator.predicate(
      "utilization_percentage should exceed 80",
      projectAAlert!.utilization_percentage > 80,
    );
    TestValidator.predicate(
      "utilization_percentage should be approximately 83",
      projectAAlert!.utilization_percentage >= 82 &&
        projectAAlert!.utilization_percentage <= 85,
    );
  }
  // 11. Project B should NOT appear in budget_alerts (1% utilization < 80%)
  const projectBAlert = dashboard.budget_alerts.find(
    (alert) => alert.project_id === projectB.id,
  );
  TestValidator.predicate(
    "Project B should NOT appear in budget_alerts",
    projectBAlert === undefined,
  );
  // 12. Project C (no budget) should NOT appear in budget_alerts
  const projectCAlert = dashboard.budget_alerts.find(
    (alert) => alert.project_id === projectC.id,
  );
  TestValidator.predicate(
    "Project C (null budget) should NOT appear in budget_alerts",
    projectCAlert === undefined,
  );
  // 13. Validate all budget_alert entries have required properties
  for (const alert of dashboard.budget_alerts) {
    TestValidator.predicate(
      "alert should have project_id",
      typeof alert.project_id === "string" && alert.project_id.length > 0,
    );
    TestValidator.predicate(
      "alert should have project_name",
      typeof alert.project_name === "string" && alert.project_name.length > 0,
    );
    TestValidator.predicate(
      "alert should have budget_hours >= 0",
      typeof alert.budget_hours === "number" && alert.budget_hours >= 0,
    );
    TestValidator.predicate(
      "alert should have actual_hours >= 0",
      typeof alert.actual_hours === "number" && alert.actual_hours >= 0,
    );
    TestValidator.predicate(
      "alert should have utilization_percentage > 80 and <= 100",
      alert.utilization_percentage > 80 && alert.utilization_percentage <= 100,
    );
  }
}
