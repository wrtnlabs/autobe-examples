import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmDepartment";
import type { IErpHrmEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmEmployee";
import type { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
import type { IErpHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmOrganization";
import type { IErpHrmProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmProject";
import type { IErpHrmRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmRole";
import type { IErpHrmTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTask";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIErpHrmProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIErpHrmProject";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_erp_hrm_member_projects_create } from "../../../generate/generate_random_erp_hrm_member_projects_create";
import { prepare_random_erp_hrm_project } from "../../../prepare/prepare_random_erp_hrm_project";

/**
 * Test budget utilization report when no projects have budget hours defined.
 * This validates that projects without budget_hours are automatically excluded
 * from the budget report, resulting in empty results (valid state, not error).
 */
export async function test_api_project_budget_report_no_budget_defined(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member connection using authorize_member_join utility
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      displayName: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  // 2. Create 2-3 projects WITHOUT budget_hours (explicitly set to null)
  const projects = await ArrayUtil.asyncRepeat(3, async () => {
    return await generate_random_erp_hrm_member_projects_create(
      memberConnection,
      {
        body: {
          name: RandomGenerator.name(2),
          color_code: RandomGenerator.pick([
            "#FF5733",
            "#33FF57",
            "#3357FF",
            "#F333FF",
            "#33FFF3",
          ]) satisfies string & tags.Pattern<"^#[0-9A-Fa-f]{6}$">,
          description: RandomGenerator.paragraph({ sentences: 3 }),
          budget_hours: null, // Explicitly set to null - no budget defined
        },
      },
    );
  });
  // Validate projects were created successfully
  typia.assert(projects);
  TestValidator.predicate("projects created", projects.length === 3);
  // 3. Call budget report endpoint without status filter
  const budgetReport =
    await api.functional.erpHrm.member.reports.projects.budget.index(
      memberConnection,
      {
        body: {} satisfies IErpHrmProject.IBudgetRequest, // No status filter
      },
    );
  typia.assert(budgetReport);
  // 4. Validate empty results
  // Projects without budget_hours are excluded from the report
  TestValidator.equals(
    "data should be empty array",
    budgetReport.data.length,
    0,
  );
  TestValidator.equals(
    "pagination.current should be 1",
    budgetReport.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination.records should be 0",
    budgetReport.pagination.records,
    0,
  );
  TestValidator.equals(
    "pagination.pages should be 0",
    budgetReport.pagination.pages,
    0,
  );
}
