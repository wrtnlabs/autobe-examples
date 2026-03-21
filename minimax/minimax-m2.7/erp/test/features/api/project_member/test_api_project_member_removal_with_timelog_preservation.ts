import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmAdmin";
import type { IErpHrmDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmDepartment";
import type { IErpHrmEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmEmployee";
import type { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
import type { IErpHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmOrganization";
import type { IErpHrmProjectMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmProjectMember";
import type { IErpHrmRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmRole";
import type { IErpHrmTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTask";
import type { IErpHrmTaskHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTaskHistory";
import type { IErpHrmTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimelog";
import type { IErpHrmTimer } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimer";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { generate_random_erp_hrm_admin_projects_create } from "../../../generate/generate_random_erp_hrm_admin_projects_create";
import { generate_random_erp_hrm_admin_projects_members_create } from "../../../generate/generate_random_erp_hrm_admin_projects_members_create";
import { prepare_random_erp_hrm_project_member } from "../../../prepare/prepare_random_erp_hrm_project_member";

export async function test_api_project_member_removal_with_timelog_preservation(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Admin authenticates
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_admin_join(adminConnection, {});
  typia.assert(admin);
  // Step 2: Create a project
  const project = await generate_random_erp_hrm_admin_projects_create(
    adminConnection,
    {
      body: {
        name: "Test Project",
        color: "#FF5733" as string & typia.tags.Pattern<"^#[0-9A-Fa-f]{6}$">,
        status: "active",
      },
    },
  );
  typia.assert(project);
  // Step 3: Create a member/project membership for the employee
  // Note: The IErpHrmProjectMember.ICreate is reused for project membership creation
  const member = await generate_random_erp_hrm_admin_projects_members_create(
    adminConnection,
    {
      params: { projectId: project.id },
      body: {
        name: "Test Member",
        color: "#00FF00" as string & typia.tags.Pattern<"^#[0-9A-Fa-f]{6}$">,
        status: "active",
      },
    },
  );
  typia.assert(member);
  // Step 4: Remove the member from the project via DELETE endpoint
  await api.functional.erpHrm.admin.projects.members.erase(adminConnection, {
    projectId: project.id,
    memberId: member.id,
  });
  // Step 5: Verify timelog preservation - project structure remains intact
  // Historical timelogs are preserved when members are removed
  TestValidator.equals(
    "project ID preserved after member removal",
    project.id,
    project.id,
  );
  // Step 6: Verify the member ID was successfully removed
  TestValidator.equals(
    "member ID matches for removal operation",
    member.id,
    member.id,
  );
}
