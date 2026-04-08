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
import type { IErpHrmTimer } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimer";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIErpHrmTimer } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIErpHrmTimer";
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
import { generate_random_erp_hrm_member_timers_create } from "../../../generate/generate_random_erp_hrm_member_timers_create";
import { prepare_random_erp_hrm_organization } from "../../../prepare/prepare_random_erp_hrm_organization";
import { prepare_random_erp_hrm_project } from "../../../prepare/prepare_random_erp_hrm_project";
import { prepare_random_erp_hrm_project_member } from "../../../prepare/prepare_random_erp_hrm_project_member";
import { prepare_random_erp_hrm_timer } from "../../../prepare/prepare_random_erp_hrm_timer";

export async function test_api_timer_retrieval_filtered_by_project(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin creates account and organization
  const adminConnection: api.IConnection = { host: connection.host };
  const password = RandomGenerator.alphaNumeric(16);
  const adminAuth = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: password,
      displayName: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IErpHrmAdmin.IJoin,
  });
  typia.assert(adminAuth);
  // 2. Create organization (admin becomes owner/employee)
  const organization = await generate_random_erp_hrm_admin_organizations_create(
    adminConnection,
    {},
  );
  typia.assert(organization);
  // 3. Login as admin
  const adminLoginConnection: api.IConnection = { host: connection.host };
  await authorize_admin_login(adminLoginConnection, {
    body: {
      email: adminAuth.email,
      password: password,
      href: "https://example.com",
      referrer: "https://example.com",
    } satisfies IErpHrmAdmin.ILogin,
  });
  // 4. Create two projects
  const project1 = await generate_random_erp_hrm_admin_projects_create(
    adminLoginConnection,
    {
      body: {
        name: "Project Alpha",
        color: "#FF5733",
        status: "active",
      } satisfies IErpHrmProject.ICreate,
    },
  );
  typia.assert(project1);
  const project2 = await generate_random_erp_hrm_admin_projects_create(
    adminLoginConnection,
    {
      body: {
        name: "Project Beta",
        color: "#4A90E2",
        status: "active",
      } satisfies IErpHrmProject.ICreate,
    },
  );
  typia.assert(project2);
  // Get project IDs from the response structure
  const project1Id = project1.items[0].projectId;
  const project2Id = project2.items[0].projectId;
  // 5. Create member account and add as employee to projects
  const memberPassword = RandomGenerator.alphaNumeric(16);
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: memberPassword,
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IErpHrmMember.IJoin,
  });
  typia.assert(memberAuth);
  // Login as member
  const memberLoginConnection: api.IConnection = { host: connection.host };
  await authorize_member_login(memberLoginConnection, {
    body: {
      email: memberAuth.email,
      password: memberPassword,
      href: "https://example.com",
      referrer: "https://example.com",
    } satisfies IErpHrmMember.ILogin,
  });
  // Add member as project member to both projects
  const projectMember1 =
    await generate_random_erp_hrm_admin_projects_members_create(
      adminLoginConnection,
      {
        params: { projectId: project1Id },
        body: {
          employeeId: memberAuth.id,
          assignedRole: "member",
        } satisfies IErpHrmProjectMember.ICreate,
      },
    );
  typia.assert(projectMember1);
  const projectMember2 =
    await generate_random_erp_hrm_admin_projects_members_create(
      adminLoginConnection,
      {
        params: { projectId: project2Id },
        body: {
          employeeId: memberAuth.id,
          assignedRole: "member",
        } satisfies IErpHrmProjectMember.ICreate,
      },
    );
  typia.assert(projectMember2);
  // 6. Start timers on both projects
  const timer1 = await generate_random_erp_hrm_member_timers_create(
    memberLoginConnection,
    {
      body: {
        erpHrmProjectId: project1Id,
        description: "Working on Project Alpha",
      } satisfies IErpHrmTimer.ICreate,
    },
  );
  typia.assert(timer1);
  const timer2 = await generate_random_erp_hrm_member_timers_create(
    memberLoginConnection,
    {
      body: {
        erpHrmProjectId: project2Id,
        description: "Working on Project Beta",
      } satisfies IErpHrmTimer.ICreate,
    },
  );
  typia.assert(timer2);
  // 7. Retrieve timers filtered by project 1
  const filteredTimers1 = await api.functional.erpHrm.member.timers.index(
    memberLoginConnection,
    {
      body: {
        project_id: project1Id,
      } satisfies IErpHrmTimer.IRequest,
    },
  );
  typia.assert(filteredTimers1);
  // Validate only project 1's timer is returned
  TestValidator.equals(
    "filtered by project 1 - timer count",
    filteredTimers1.data.length,
    1,
  );
  TestValidator.equals(
    "filtered by project 1 - project id matches",
    filteredTimers1.data[0].project.id,
    project1Id,
  );
  TestValidator.equals(
    "filtered by project 1 - timer id matches",
    filteredTimers1.data[0].id,
    timer1.id,
  );
  // 8. Retrieve timers filtered by project 2
  const filteredTimers2 = await api.functional.erpHrm.member.timers.index(
    memberLoginConnection,
    {
      body: {
        project_id: project2Id,
      } satisfies IErpHrmTimer.IRequest,
    },
  );
  typia.assert(filteredTimers2);
  // Validate only project 2's timer is returned
  TestValidator.equals(
    "filtered by project 2 - timer count",
    filteredTimers2.data.length,
    1,
  );
  TestValidator.equals(
    "filtered by project 2 - project id matches",
    filteredTimers2.data[0].project.id,
    project2Id,
  );
  TestValidator.equals(
    "filtered by project 2 - timer id matches",
    filteredTimers2.data[0].id,
    timer2.id,
  );
  // 9. Verify the timers are different
  TestValidator.notEquals(
    "different timers returned",
    filteredTimers1.data[0].id,
    filteredTimers2.data[0].id,
  );
}
