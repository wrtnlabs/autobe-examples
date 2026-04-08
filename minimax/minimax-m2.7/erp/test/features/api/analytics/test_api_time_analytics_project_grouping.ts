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

export async function test_api_time_analytics_project_grouping(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin setup - join and login
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_admin_join(adminConnection, {});
  const adminLoginConnection: api.IConnection = { host: connection.host };
  await authorize_admin_login(adminLoginConnection, {
    body: {
      email: adminAuth.email,
      password: "test1234",
      href: "http://localhost:3000",
      referrer: "http://localhost:3000",
    } satisfies IErpHrmAdmin.ILogin,
  });
  // 2. Create organization
  const organization = await generate_random_erp_hrm_admin_organizations_create(
    adminLoginConnection,
    {},
  );
  typia.assert(organization);
  // 3. Member setup - join as member
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {});
  const memberLoginConnection: api.IConnection = { host: connection.host };
  await authorize_member_login(memberLoginConnection, {
    body: {
      email: memberAuth.email,
      password: "test1234",
      href: "http://localhost:3000",
      referrer: "http://localhost:3000",
    } satisfies IErpHrmMember.ILogin,
  });
  // 4. Create project data with known values for validation
  const project1Name = `Project Alpha ${RandomGenerator.alphaNumeric(8)}`;
  const project1Color = "#FF5733";
  const project1Budget = 100;
  const project2Name = `Project Beta ${RandomGenerator.alphaNumeric(8)}`;
  const project2Color = "#4A90E2";
  const project2Budget = 200;
  // Create two projects
  const project1Result = await generate_random_erp_hrm_admin_projects_create(
    adminLoginConnection,
    {
      body: {
        name: project1Name,
        color: project1Color,
        description: "First test project",
        status: "active",
        budgetHours: project1Budget,
      },
    },
  );
  typia.assert(project1Result);
  const project2Result = await generate_random_erp_hrm_admin_projects_create(
    adminLoginConnection,
    {
      body: {
        name: project2Name,
        color: project2Color,
        description: "Second test project",
        status: "active",
        budgetHours: project2Budget,
      },
    },
  );
  typia.assert(project2Result);
  // 5. Query time analytics with date range
  const today = new Date();
  const dateFrom = new Date(today);
  dateFrom.setDate(dateFrom.getDate() - 7);
  const dateTo = new Date(today);
  dateTo.setDate(dateTo.getDate() + 1);
  const analyticsResponse =
    await api.functional.erpHrm.admin.analytics.time.index(
      adminLoginConnection,
      {
        body: {
          date_from: dateFrom.toISOString(),
          date_to: dateTo.toISOString(),
          page: 1,
          limit: 10,
        },
      },
    );
  typia.assert(analyticsResponse);
  // 6. Validate analytics response structure
  TestValidator.equals(
    "pagination exists",
    analyticsResponse.pagination !== null,
    true,
  );
  TestValidator.equals(
    "pagination has current page",
    analyticsResponse.pagination.current !== null,
    true,
  );
  TestValidator.equals(
    "pagination has limit",
    analyticsResponse.pagination.limit !== null,
    true,
  );
  TestValidator.equals(
    "pagination has records",
    analyticsResponse.pagination.records !== null,
    true,
  );
  TestValidator.equals(
    "pagination has pages",
    analyticsResponse.pagination.pages !== null,
    true,
  );
  TestValidator.predicate(
    "data array exists",
    Array.isArray(analyticsResponse.data),
  );
  // 7. Validate response data items structure (if any exist)
  for (const item of analyticsResponse.data) {
    // Each item should have grouping metrics
    TestValidator.equals(
      "item has totalMinutes",
      typeof item.totalMinutes,
      "number",
    );
    TestValidator.equals(
      "item has billableMinutes",
      typeof item.billableMinutes,
      "number",
    );
    TestValidator.equals(
      "item has nonBillableMinutes",
      typeof item.nonBillableMinutes,
      "number",
    );
    TestValidator.equals(
      "item has timelogCount",
      typeof item.timelogCount,
      "number",
    );
    TestValidator.equals("item has groupBy", typeof item.groupBy, "string");
    // When grouping is by project, project field should be populated
    if (item.groupBy === "project" && item.project) {
      TestValidator.equals(
        "project item has id",
        typeof item.project.id,
        "string",
      );
      TestValidator.equals(
        "project item has name",
        typeof item.project.name,
        "string",
      );
      TestValidator.equals(
        "project item has color",
        typeof item.project.color,
        "string",
      );
      TestValidator.equals(
        "project item has status",
        typeof item.project.status,
        "string",
      );
    }
    // When grouping is by employee, employee field should be populated
    // Note: IErpHrmEmployee.ISummary has 'member' property containing IErpHrmMember.ISummary with email
    if (item.groupBy === "employee" && item.employee) {
      TestValidator.equals(
        "employee item has id",
        typeof item.employee.id,
        "string",
      );
      TestValidator.equals(
        "employee item has member",
        typeof item.employee.member,
        "object",
      );
      TestValidator.equals(
        "employee item has email via member",
        typeof item.employee.member?.email,
        "string",
      );
    }
    // When grouping is by task, task field should be populated
    if (item.groupBy === "task" && item.task) {
      TestValidator.equals("task item has id", typeof item.task.id, "string");
      TestValidator.equals(
        "task item has title",
        typeof item.task.title,
        "string",
      );
    }
  }
  // 8. Validate totalMinutes equals billable + nonBillable
  for (const item of analyticsResponse.data) {
    TestValidator.equals(
      "total equals billable plus non-billable",
      item.totalMinutes,
      item.billableMinutes + item.nonBillableMinutes,
    );
  }
  // 9. Test with specific project filter if we had valid project IDs
  // Since we don't have project IDs from IErpHrmProject, we test with invalid UUID
  const invalidProjectId = typia.random<string & tags.Format<"uuid">>();
  const filteredResponse =
    await api.functional.erpHrm.admin.analytics.time.index(
      adminLoginConnection,
      {
        body: {
          date_from: dateFrom.toISOString(),
          date_to: dateTo.toISOString(),
          project_id: invalidProjectId,
          page: 1,
          limit: 10,
        },
      },
    );
  typia.assert(filteredResponse);
  TestValidator.predicate(
    "filtered response is valid structure",
    Array.isArray(filteredResponse.data),
  );
  // 10. Test billable filter
  const billableResponse =
    await api.functional.erpHrm.admin.analytics.time.index(
      adminLoginConnection,
      {
        body: {
          date_from: dateFrom.toISOString(),
          date_to: dateTo.toISOString(),
          billable: true,
          page: 1,
          limit: 10,
        },
      },
    );
  typia.assert(billableResponse);
  TestValidator.predicate(
    "billable filtered response is valid structure",
    Array.isArray(billableResponse.data),
  );
  // For items in billable filter, all should have billable time
  for (const item of billableResponse.data) {
    TestValidator.predicate(
      "billable filter returns items with billable time",
      item.billableMinutes > 0,
    );
  }
  // 11. Test non-billable filter
  const nonBillableResponse =
    await api.functional.erpHrm.admin.analytics.time.index(
      adminLoginConnection,
      {
        body: {
          date_from: dateFrom.toISOString(),
          date_to: dateTo.toISOString(),
          billable: false,
          page: 1,
          limit: 10,
        },
      },
    );
  typia.assert(nonBillableResponse);
  TestValidator.predicate(
    "non-billable filtered response is valid structure",
    Array.isArray(nonBillableResponse.data),
  );
}
