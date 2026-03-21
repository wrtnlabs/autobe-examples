import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmDashboard } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmDashboard";
import type { IErpHrmDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmDepartment";
import type { IErpHrmEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmEmployee";
import type { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
import type { IErpHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmOrganization";
import type { IErpHrmOrganizationDashboard } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmOrganizationDashboard";
import type { IErpHrmRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmRole";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_erp_hrm_member_employees_create } from "../../../generate/generate_random_erp_hrm_member_employees_create";
import { prepare_random_erp_hrm_employee } from "../../../prepare/prepare_random_erp_hrm_employee";

/**
 * Test organization dashboard retrieval by an organization owner.
 *
 * 1. Owner authenticates via member join (creates first organization with owner role)
 * 2. Access dashboard endpoint to retrieve organization metrics
 * 3. Validate response structure and metrics
 * 4. Create additional employees for meaningful data
 * 5. Verify dashboard reflects updated employee count
 */
export async function test_api_dashboard_organization_overview(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create owner connection and authenticate via member join
  const ownerConnection: api.IConnection = { host: connection.host };
  const ownerAuth = await authorize_member_join(ownerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      displayName: RandomGenerator.name(),
    } satisfies DeepPartial<IErpHrmMember.IJoin>,
  });
  typia.assert(ownerAuth);
  // Step 2: Fetch initial dashboard data
  const initialDashboard =
    await api.functional.erpHrm.member.reports.dashboard(ownerConnection);
  typia.assert(initialDashboard);
  // Step 3: Validate initial dashboard metrics
  TestValidator.equals(
    "initial totalActiveEmployees should be 1 (owner)",
    initialDashboard.totalActiveEmployees,
    1,
  );
  TestValidator.predicate(
    "initial weeklyHours should be >= 0",
    initialDashboard.weeklyHours >= 0,
  );
  TestValidator.predicate(
    "initial pendingApprovals should be >= 0",
    initialDashboard.pendingApprovals >= 0,
  );
  TestValidator.predicate(
    "initial budgetAlerts should be array",
    Array.isArray(initialDashboard.budgetAlerts),
  );
  TestValidator.predicate(
    "initial topPerformers should be array",
    Array.isArray(initialDashboard.topPerformers),
  );
  // Step 4: Create additional employees for meaningful data
  const employees = await ArrayUtil.asyncRepeat(3, async () => {
    return await generate_random_erp_hrm_member_employees_create(
      ownerConnection,
      {
        body: {
          email: typia.random<string & tags.Format<"email">>(),
          employmentType: RandomGenerator.pick([
            "full_time",
            "part_time",
            "contractor",
            "intern",
          ] as const),
        } satisfies DeepPartial<IErpHrmEmployee.ICreate>,
      },
    );
  });
  // Step 5: Fetch updated dashboard data
  const updatedDashboard =
    await api.functional.erpHrm.member.reports.dashboard(ownerConnection);
  typia.assert(updatedDashboard);
  // Step 6: Validate updated dashboard metrics
  TestValidator.equals(
    "updated totalActiveEmployees should be 4 (owner + 3 employees)",
    updatedDashboard.totalActiveEmployees,
    4,
  );
  TestValidator.predicate(
    "updated weeklyHours should be >= 0",
    updatedDashboard.weeklyHours >= 0,
  );
  TestValidator.predicate(
    "updated pendingApprovals should be >= 0",
    updatedDashboard.pendingApprovals >= 0,
  );
  TestValidator.predicate(
    "updated budgetAlerts should be array",
    Array.isArray(updatedDashboard.budgetAlerts),
  );
  TestValidator.predicate(
    "updated topPerformers should be array",
    Array.isArray(updatedDashboard.topPerformers),
  );
  // Step 7: Validate multi-tenancy isolation - create another organization and verify isolation
  const otherOwnerConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(otherOwnerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      displayName: RandomGenerator.name(),
    } satisfies DeepPartial<IErpHrmMember.IJoin>,
  });
  // Other organization's dashboard should only show their own employees (1 = just the owner)
  const otherDashboard =
    await api.functional.erpHrm.member.reports.dashboard(otherOwnerConnection);
  typia.assert(otherDashboard);
  TestValidator.equals(
    "other organization totalActiveEmployees should be 1",
    otherDashboard.totalActiveEmployees,
    1,
  );
  // Step 8: Validate budget alert structure if any exist
  for (const alert of updatedDashboard.budgetAlerts) {
    typia.assert<IErpHrmOrganizationDashboard.IBudgetAlert>(alert);
    TestValidator.predicate(
      "budgetAlert project_name should be non-empty",
      alert.project_name.length > 0,
    );
    TestValidator.predicate(
      "budgetAlert budget_hours should be >= 0",
      alert.budget_hours >= 0,
    );
    TestValidator.predicate(
      "budgetAlert actual_hours should be >= 0",
      alert.actual_hours >= 0,
    );
    TestValidator.predicate(
      "budgetAlert utilization_percentage should be 0-100",
      alert.utilization_percentage >= 0 && alert.utilization_percentage <= 100,
    );
  }
  // Step 9: Validate top performer structure if any exist
  for (const performer of updatedDashboard.topPerformers) {
    typia.assert<IErpHrmOrganizationDashboard.ITopPerformer>(performer);
    TestValidator.predicate(
      "topPerformer employee should have id",
      performer.employee.id.length > 0,
    );
    TestValidator.predicate(
      "topPerformer hours_logged should be >= 0",
      performer.hours_logged >= 0,
    );
  }
}
