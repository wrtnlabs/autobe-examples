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
import { generate_random_erp_hrm_admin_employees_create } from "../../../generate/generate_random_erp_hrm_admin_employees_create";
import { generate_random_erp_hrm_admin_organizations_create } from "../../../generate/generate_random_erp_hrm_admin_organizations_create";
import { generate_random_erp_hrm_admin_projects_create } from "../../../generate/generate_random_erp_hrm_admin_projects_create";
import { generate_random_erp_hrm_admin_projects_members_create } from "../../../generate/generate_random_erp_hrm_admin_projects_members_create";
import { generate_random_erp_hrm_member_timelogs_create } from "../../../generate/generate_random_erp_hrm_member_timelogs_create";
import { prepare_random_erp_hrm_employee } from "../../../prepare/prepare_random_erp_hrm_employee";
import { prepare_random_erp_hrm_organization } from "../../../prepare/prepare_random_erp_hrm_organization";
import { prepare_random_erp_hrm_project } from "../../../prepare/prepare_random_erp_hrm_project";
import { prepare_random_erp_hrm_project_member } from "../../../prepare/prepare_random_erp_hrm_project_member";
import { prepare_random_erp_hrm_timelog } from "../../../prepare/prepare_random_erp_hrm_timelog";

export async function test_api_timelog_query_filter_by_billable_status(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin setup - register and login
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
  // 2. Create organization (admin becomes owner employee)
  const organization = await generate_random_erp_hrm_admin_organizations_create(
    adminLoginConnection,
    {},
  );
  typia.assert(organization);
  // 3. Create project
  const project = await generate_random_erp_hrm_admin_projects_create(
    adminLoginConnection,
    {
      body: {
        name: RandomGenerator.paragraph({ sentences: 2 }),
        color: "#FF5733",
        status: "active",
      } satisfies IErpHrmProject.ICreate,
    },
  );
  typia.assert(project);
  // 4. Create member connection and login (admin as member)
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_login(memberConnection, {
    body: {
      email: adminAuth.email,
      password: "test1234",
      href: "http://localhost:3000",
      referrer: "http://localhost:3000",
    } satisfies IErpHrmMember.ILogin,
  });
  // 5. Create timelogs with different billable statuses
  const billableTimelog1 = await generate_random_erp_hrm_member_timelogs_create(
    memberConnection,
    {
      body: {
        projectId: (project as any).id ?? organization.id,
        date: new Date().toISOString(),
        durationMinutes: 120,
        description: "Billable work task 1",
        billable: true,
      } satisfies IErpHrmTimelog.ICreate,
    },
  );
  typia.assert(billableTimelog1);
  const nonBillableTimelog =
    await generate_random_erp_hrm_member_timelogs_create(memberConnection, {
      body: {
        projectId: (project as any).id ?? organization.id,
        date: new Date().toISOString(),
        durationMinutes: 90,
        description: "Non-billable meeting time",
        billable: false,
      } satisfies IErpHrmTimelog.ICreate,
    });
  typia.assert(nonBillableTimelog);
  const billableTimelog2 = await generate_random_erp_hrm_member_timelogs_create(
    memberConnection,
    {
      body: {
        projectId: (project as any).id ?? organization.id,
        date: new Date().toISOString(),
        durationMinutes: 60,
        description: "Billable development work",
        billable: true,
      } satisfies IErpHrmTimelog.ICreate,
    },
  );
  typia.assert(billableTimelog2);
  // 6. Query with billable=true filter - expect only billable timelogs
  const billableResult =
    await api.functional.erpHrm.admin.members.timelogs.index(
      adminLoginConnection,
      {
        memberId: adminAuth.id,
        body: {
          billable: true,
        } satisfies IErpHrmTimelog.IRequest,
      },
    );
  typia.assert(billableResult);
  // Validate only billable timelogs are returned
  TestValidator.equals(
    "billable filter returns 2 results",
    billableResult.data.length,
    2,
  );
  // Note: ISummary type does not include billable property, so we cannot validate individual billable status
  // 7. Query with billable=false filter - expect only non-billable timelogs
  const nonBillableResult =
    await api.functional.erpHrm.admin.members.timelogs.index(
      adminLoginConnection,
      {
        memberId: adminAuth.id,
        body: {
          billable: false,
        } satisfies IErpHrmTimelog.IRequest,
      },
    );
  typia.assert(nonBillableResult);
  // Validate only non-billable timelogs are returned
  TestValidator.equals(
    "non-billable filter returns 1 result",
    nonBillableResult.data.length,
    1,
  );
  // Note: ISummary type does not include billable property, so we cannot validate individual billable status
  // 8. Validate total count across both filters matches all timelogs
  TestValidator.equals(
    "total timelogs match",
    billableResult.data.length + nonBillableResult.data.length,
    3,
  );
}