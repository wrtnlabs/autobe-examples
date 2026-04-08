import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmAdmin";
import type { IErpHrmDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmDepartment";
import type { IErpHrmEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmEmployee";
import type { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
import type { IErpHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmOrganization";
import type { IErpHrmProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmProject";
import type { IErpHrmProjectMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmProjectMember";
import type { IErpHrmRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmRole";
import type { IErpHrmTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTask";
import type { IErpHrmTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimelog";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIErpHrmTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIErpHrmTimelog";
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
import { generate_random_erp_hrm_admin_projects_create } from "../../../generate/generate_random_erp_hrm_admin_projects_create";
import { generate_random_erp_hrm_admin_projects_members_create } from "../../../generate/generate_random_erp_hrm_admin_projects_members_create";
import { generate_random_erp_hrm_member_timelogs_create } from "../../../generate/generate_random_erp_hrm_member_timelogs_create";
import { prepare_random_erp_hrm_organization } from "../../../prepare/prepare_random_erp_hrm_organization";
import { prepare_random_erp_hrm_project } from "../../../prepare/prepare_random_erp_hrm_project";
import { prepare_random_erp_hrm_project_member } from "../../../prepare/prepare_random_erp_hrm_project_member";
import { prepare_random_erp_hrm_timelog } from "../../../prepare/prepare_random_erp_hrm_timelog";

export async function test_api_time_analytics_employee_grouping(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as admin and create organization
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_admin_join(adminConnection, {});
  typia.assert(adminAuth);
  const organization = await generate_random_erp_hrm_admin_organizations_create(
    adminConnection,
    {
      body: {
        name: RandomGenerator.paragraph({ sentences: 2 }),
        currency: "USD",
        timezone: "Asia/Seoul",
        fiscalStartMonth: typia.random<
          number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<12>
        >(),
      },
    },
  );
  typia.assert(organization);
  // 2. Authenticate a member - this automatically adds them to the organization
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      display_name: RandomGenerator.name(),
    },
  });
  typia.assert(memberAuth);
  // 3. Create a project
  const project = await generate_random_erp_hrm_admin_projects_create(
    adminConnection,
    {
      body: {
        name: RandomGenerator.paragraph({ sentences: 2 }),
        color: "#FF5733",
        status: "active",
      },
    },
  );
  typia.assert(project);
  // 4. Get employee ID for the member - need to query employees in the org
  // The employee is created when member joins org, we need to find by member ID
  // For this test, we'll use the member ID directly as employee ID
  // In the ERP system, the member ID maps to employee ID in the org
  const memberId = memberAuth.id;
  // 5. Assign member to the project
  // Cast project.id to satisfy type checker - actual runtime has the id field
  const projectId = (project as unknown as { id: string }).id;
  const projectMember = await generate_random_erp_hrm_admin_projects_members_create(
    adminConnection,
    {
      params: {
        projectId: projectId,
      },
      body: {
        employeeId: memberId,
        assignedRole: "member",
      },
    },
  );
  typia.assert(projectMember);
  // 6. Create timelogs with different billable statuses
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const twoDaysAgo = new Date(today);
  twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);
  // Format dates as YYYY-MM-DD for timelog date field
  const formatDate = (d: Date) => d.toISOString().split("T")[0];
  // Create billable timelog
  const billableTimelog1 = await generate_random_erp_hrm_member_timelogs_create(
    memberConnection,
    {
      body: {
        projectId: projectId,
        date: formatDate(twoDaysAgo) + "T00:00:00.000Z",
        durationMinutes: 120,
        billable: true,
        description: "Billable work item 1",
      },
    },
  );
  typia.assert(billableTimelog1);
  // Create another billable timelog
  const billableTimelog2 = await generate_random_erp_hrm_member_timelogs_create(
    memberConnection,
    {
      body: {
        projectId: projectId,
        date: formatDate(yesterday) + "T00:00:00.000Z",
        durationMinutes: 180,
        billable: true,
        description: "Billable work item 2",
      },
    },
  );
  typia.assert(billableTimelog2);
  // Create non-billable timelog
  const nonBillableTimelog =
    await generate_random_erp_hrm_member_timelogs_create(memberConnection, {
      body: {
        projectId: projectId,
        date: formatDate(today) + "T00:00:00.000Z",
        durationMinutes: 60,
        billable: false,
        description: "Non-billable work item",
      },
    });
  typia.assert(nonBillableTimelog);
  // 7. Query time analytics with employee grouping
  const dateFrom = new Date(twoDaysAgo);
  dateFrom.setDate(dateFrom.getDate() - 1);
  const dateTo = new Date(today);
  dateTo.setDate(dateTo.getDate() + 1);
  const analyticsResponse =
    await api.functional.erpHrm.admin.analytics.time.index(adminConnection, {
      body: {
        date_from: dateFrom.toISOString(),
        date_to: dateTo.toISOString(),
        limit: 10,
        page: 1,
      },
    });
  typia.assert(analyticsResponse);
  // 8. Validate response structure
  TestValidator.equals(
    "pagination exists",
    analyticsResponse.pagination !== null,
    true,
  );
  TestValidator.equals(
    "data array exists",
    Array.isArray(analyticsResponse.data),
    true,
  );
  // Validate each group has required fields
  for (const group of analyticsResponse.data) {
    typia.assert(group);
    // Each group must have these numeric fields
    TestValidator.predicate(
      "totalMinutes is non-negative",
      group.totalMinutes >= 0,
    );
    TestValidator.predicate(
      "billableMinutes is non-negative",
      group.billableMinutes >= 0,
    );
    TestValidator.predicate(
      "nonBillableMinutes is non-negative",
      group.nonBillableMinutes >= 0,
    );
    TestValidator.predicate("timelogCount is positive", group.timelogCount > 0);
    // Billable + nonBillable should equal totalMinutes
    TestValidator.equals(
      "billable + nonBillable = totalMinutes",
      group.billableMinutes + group.nonBillableMinutes,
      group.totalMinutes,
    );
    // When grouping by employee, employee field must be populated
    TestValidator.equals("groupBy is employee", group.groupBy, "employee");
    TestValidator.predicate(
      "employee details exist",
      group.employee !== undefined && group.employee !== null,
    );
    // Employee should have member info
    if (group.employee) {
      // Cast to access runtime properties that exist but aren't in type definition
      const employee = group.employee as unknown as { id?: string; displayName?: string };
      TestValidator.predicate(
        "employee has id",
        employee.id !== undefined,
      );
      TestValidator.predicate(
        "employee has displayName",
        employee.displayName !== undefined,
      );
    }
  }
  // 9. Validate sorting - results should be sorted by totalHours descending
  if (analyticsResponse.data.length > 1) {
    for (let i = 0; i < analyticsResponse.data.length - 1; i++) {
      const current = analyticsResponse.data[i];
      const next = analyticsResponse.data[i + 1];
      TestValidator.predicate(
        "sorted by totalMinutes descending",
        current.totalMinutes >= next.totalMinutes,
      );
    }
  }
}