import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmAdmin";
import type { IErpHrmDashboard } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmDashboard";
import type { IErpHrmDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmDepartment";
import type { IErpHrmEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmEmployee";
import type { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
import type { IErpHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmOrganization";
import type { IErpHrmOrganizationContext } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmOrganizationContext";
import type { IErpHrmProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmProject";
import type { IErpHrmRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmRole";
import type { IErpHrmTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTask";
import type { IErpHrmTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimelog";
import type { IErpHrmTimer } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimer";
import type { IErpHrmTimesheet } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimesheet";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_erp_hrm_admin_organizations_create } from "../../../generate/generate_random_erp_hrm_admin_organizations_create";
import { generate_random_erp_hrm_member_organization_context_select } from "../../../generate/generate_random_erp_hrm_member_organization_context_select";
import { prepare_random_erp_hrm_organization } from "../../../prepare/prepare_random_erp_hrm_organization";
import { prepare_random_erp_hrm_organization_context } from "../../../prepare/prepare_random_erp_hrm_organization_context";

export async function test_api_dashboard_owner_with_organizational_metrics(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create owner member account
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await api.functional.erpHrm.auth.member.join(
    memberConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: "TestPassword123!",
        display_name: RandomGenerator.name(),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IErpHrmMember.IJoin,
    },
  );
  typia.assert(member);
  // Step 2: Create organization (member becomes owner with report:view permission)
  const organization = await api.functional.erpHrm.admin.organizations.create(
    memberConnection,
    {
      body: {
        name: RandomGenerator.paragraph({ sentences: 2 }),
        currency: "USD",
        timezone: "Asia/Seoul",
        fiscalStartMonth: typia.random<
          number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<12>
        >() satisfies number as number,
      } satisfies IErpHrmOrganization.ICreate,
    },
  );
  typia.assert(organization);
  // Step 3: Set organization context
  const orgContext =
    await api.functional.erpHrm.member.organization_context.select(
      memberConnection,
      {
        body: {
          organizationId: organization.id,
        } satisfies IErpHrmOrganizationContext.ICreate,
      },
    );
  typia.assert(orgContext);
  // Step 4: Retrieve dashboard
  const dashboard =
    await api.functional.erpHrm.member.dashboard.at(memberConnection);
  typia.assert(dashboard);
  // Step 5: Validate personalMetrics structure
  TestValidator.equals(
    "personalMetrics exists",
    dashboard.personalMetrics !== null &&
      dashboard.personalMetrics !== undefined,
    true,
  );
  TestValidator.equals(
    "hoursToday is number",
    typeof dashboard.personalMetrics.hoursToday,
    "number",
  );
  TestValidator.equals(
    "hoursThisWeek is number",
    typeof dashboard.personalMetrics.hoursThisWeek,
    "number",
  );
  TestValidator.equals(
    "activeTimer can be null",
    dashboard.personalMetrics.activeTimer === null ||
      typeof dashboard.personalMetrics.activeTimer === "object",
    true,
  );
  TestValidator.equals(
    "recentTimelogs is array",
    Array.isArray(dashboard.personalMetrics.recentTimelogs),
    true,
  );
  TestValidator.equals(
    "assignedTasks is array",
    Array.isArray(dashboard.personalMetrics.assignedTasks),
    true,
  );
  // Step 6: Validate organizationalMetrics (owner has report:view by default)
  TestValidator.equals(
    "organizationalMetrics exists",
    dashboard.organizationalMetrics !== null &&
      dashboard.organizationalMetrics !== undefined,
    true,
  );
  const orgMetrics = dashboard.organizationalMetrics!;
  // Validate activeEmployeeCount
  TestValidator.equals(
    "activeEmployeeCount is number",
    typeof orgMetrics.activeEmployeeCount,
    "number",
  );
  TestValidator.predicate(
    "activeEmployeeCount >= 1",
    orgMetrics.activeEmployeeCount >= 1,
  );
  // Validate totalHoursThisWeek
  TestValidator.equals(
    "totalHoursThisWeek is number",
    typeof orgMetrics.totalHoursThisWeek,
    "number",
  );
  TestValidator.predicate(
    "totalHoursThisWeek >= 0",
    orgMetrics.totalHoursThisWeek >= 0,
  );
  // Validate pendingApprovalCount
  TestValidator.equals(
    "pendingApprovalCount is number",
    typeof orgMetrics.pendingApprovalCount,
    "number",
  );
  TestValidator.predicate(
    "pendingApprovalCount >= 0",
    orgMetrics.pendingApprovalCount >= 0,
  );
  // Validate budgetUtilizationOver80Percent
  TestValidator.equals(
    "budgetUtilizationOver80Percent is array",
    Array.isArray(orgMetrics.budgetUtilizationOver80Percent),
    true,
  );
  // Validate top5Performers
  TestValidator.equals(
    "top5Performers is array",
    Array.isArray(orgMetrics.top5Performers),
    true,
  );
  TestValidator.predicate(
    "top5Performers max 5",
    orgMetrics.top5Performers.length <= 5,
  );
}
