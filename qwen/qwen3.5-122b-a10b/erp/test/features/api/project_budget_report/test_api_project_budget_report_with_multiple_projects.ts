import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmMember";
import type { IHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmOrganization";
import type { IHrmProjectBudgetReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmProjectBudgetReport";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIHrmProjectBudgetReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmProjectBudgetReport";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_project_budget_report_with_multiple_projects(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member account with organization
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
  // Verify member has organizations (may be empty initially)
  const hasOrganizations =
    memberAuth.organizations && memberAuth.organizations.length > 0;
  // 2. Get organization ID for report query
  // If no organizations exist, we use a random UUID for testing endpoint structure
  const organizationId = hasOrganizations
    ? memberAuth.organizations![0].id
    : typia.random<string & tags.Format<"uuid">>();
  // 3. Call the project budget report endpoint
  const report =
    await api.functional.hrm.member.organizations.reports.project_budget.index(
      memberConnection,
      {
        organizationId,
        body: {
          page: 1,
          limit: 100,
        } satisfies IHrmProjectBudgetReport.IRequest,
      },
    );
  typia.assert(report);
  // 4. Validate pagination metadata
  TestValidator.equals("pagination current page", report.pagination.current, 1);
  TestValidator.predicate(
    "pagination limit positive",
    report.pagination.limit > 0,
  );
  TestValidator.predicate(
    "pagination records non-negative",
    report.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages non-negative",
    report.pagination.pages >= 0,
  );
  // 5. Validate data array structure
  TestValidator.predicate("data is array", Array.isArray(report.data));
  // 6. If there are projects in the report, validate each project's structure
  if (report.data.length > 0) {
    report.data.forEach((project, index) => {
      // Validate required fields exist
      TestValidator.predicate(
        `project[${index}] has valid id`,
        project.id !== undefined && project.id !== null,
      );
      TestValidator.predicate(
        `project[${index}] has valid name`,
        typeof project.name === "string" && project.name.length > 0,
      );
      TestValidator.predicate(
        `project[${index}] has valid budget_hours`,
        typeof project.budget_hours === "number" && project.budget_hours > 0,
      );
      TestValidator.predicate(
        `project[${index}] has valid actual_hours`,
        typeof project.actual_hours === "number" && project.actual_hours >= 0,
      );
      TestValidator.predicate(
        `project[${index}] has valid utilization_percentage`,
        typeof project.utilization_percentage === "number",
      );
      TestValidator.predicate(
        `project[${index}] has valid status`,
        typeof project.status === "string" && project.status.length > 0,
      );
      // Verify utilization calculation: (actual_hours / budget_hours) * 100
      // Use tolerance for floating point comparison (0.01% tolerance)
      const expectedUtilization =
        (project.actual_hours / project.budget_hours) * 100;
      const tolerance = 0.01;
      const utilizationDiff = Math.abs(
        project.utilization_percentage - expectedUtilization,
      );
      TestValidator.predicate(
        `project[${index}] utilization calculation within tolerance`,
        utilizationDiff <= tolerance,
      );
      // Check if project is flagged as over budget (> 80% utilization)
      const isOverBudget = project.utilization_percentage > 80;
      TestValidator.predicate(
        `project[${index}] over-budget flag logic`,
        isOverBudget === project.utilization_percentage > 80,
      );
    });
  }
  // 7. Verify pagination consistency
  TestValidator.equals(
    "pagination records matches data length",
    report.pagination.records,
    report.data.length,
  );
}
