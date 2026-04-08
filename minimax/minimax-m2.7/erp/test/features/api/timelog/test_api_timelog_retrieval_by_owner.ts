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
import type { IErpHrmRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmRole";
import type { IErpHrmRolePermission } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmRolePermission";
import type { IErpHrmTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTask";
import type { IErpHrmTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimelog";
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
import { generate_random_erp_hrm_admin_departments_create } from "../../../generate/generate_random_erp_hrm_admin_departments_create";
import { generate_random_erp_hrm_admin_employees_create } from "../../../generate/generate_random_erp_hrm_admin_employees_create";
import { generate_random_erp_hrm_admin_organizations_create } from "../../../generate/generate_random_erp_hrm_admin_organizations_create";
import { generate_random_erp_hrm_admin_projects_create } from "../../../generate/generate_random_erp_hrm_admin_projects_create";
import { generate_random_erp_hrm_admin_roles_create } from "../../../generate/generate_random_erp_hrm_admin_roles_create";
import { generate_random_erp_hrm_member_timelogs_create } from "../../../generate/generate_random_erp_hrm_member_timelogs_create";
import { prepare_random_erp_hrm_department } from "../../../prepare/prepare_random_erp_hrm_department";
import { prepare_random_erp_hrm_employee } from "../../../prepare/prepare_random_erp_hrm_employee";
import { prepare_random_erp_hrm_organization } from "../../../prepare/prepare_random_erp_hrm_organization";
import { prepare_random_erp_hrm_project } from "../../../prepare/prepare_random_erp_hrm_project";
import { prepare_random_erp_hrm_role } from "../../../prepare/prepare_random_erp_hrm_role";
import { prepare_random_erp_hrm_timelog } from "../../../prepare/prepare_random_erp_hrm_timelog";

interface IErpHrmProjectExtended extends IErpHrmProject {
  id: string;
  name: string;
}

export async function test_api_timelog_retrieval_by_owner(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create admin account
  const adminJoinConnection: api.IConnection = { host: connection.host };
  const adminAccount = await authorize_admin_join(adminJoinConnection, {});
  // 2. Create organization - admin automatically becomes owner with employee record
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_login(adminConnection, {
    body: {
      email: adminAccount.email,
      password: "1234",
      href: "https://example.com",
      referrer: "https://example.com",
    },
  });
  const organization = await generate_random_erp_hrm_admin_organizations_create(
    adminConnection,
    {},
  );
  // 3. Create project for time logging
  const projectRaw = await generate_random_erp_hrm_admin_projects_create(
    adminConnection,
    {
      body: {
        name: RandomGenerator.name(),
        color: "#FF5733",
        description: "Test project for timelog retrieval",
        status: "active",
      },
    },
  );
  const project = typia.assert<IErpHrmProjectExtended>(projectRaw);
  // 4. Login as member to create timelog for the admin's employee
  const memberJoinConnection: api.IConnection = { host: connection.host };
  const memberAccount = await authorize_member_join(memberJoinConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234",
      display_name: RandomGenerator.name(),
      href: "https://example.com",
      referrer: "https://example.com",
    },
  });
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_login(memberConnection, {
    body: {
      email: memberAccount.email,
      password: "1234",
      href: "https://example.com",
      referrer: "https://example.com",
    },
  });
  // 5. Create timelog as member
  const timelogDate = new Date().toISOString().split("T")[0];
  const timelog = await generate_random_erp_hrm_member_timelogs_create(
    memberConnection,
    {
      body: {
        projectId: project.id,
        date: timelogDate + "T00:00:00.000Z",
        durationMinutes: 120,
        description: "Test timelog description",
        billable: true,
      },
    },
  );
  // 6. Retrieve timelog using admin endpoint with member's ID
  const retrievedTimelog =
    await api.functional.erpHrm.admin.members.timelogs.at(adminConnection, {
      memberId: memberAccount.id,
      timelogId: timelog.id,
    });
  typia.assert(retrievedTimelog);
  // 7. Validate response contains all expected fields
  TestValidator.equals("timelog id matches", retrievedTimelog.id, timelog.id);
  TestValidator.equals("date matches", retrievedTimelog.date, timelog.date);
  TestValidator.equals(
    "duration matches",
    retrievedTimelog.durationMinutes,
    timelog.durationMinutes,
  );
  TestValidator.equals(
    "description matches",
    retrievedTimelog.description,
    timelog.description,
  );
  TestValidator.equals(
    "billable flag matches",
    retrievedTimelog.billable,
    timelog.billable,
  );
  TestValidator.equals(
    "project name matches",
    retrievedTimelog.project.name,
    project.name,
  );
  TestValidator.equals(
    "employee member id matches",
    retrievedTimelog.employee.member.id,
    memberAccount.id,
  );
}