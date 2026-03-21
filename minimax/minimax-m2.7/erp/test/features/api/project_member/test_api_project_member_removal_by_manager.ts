import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmDepartment";
import type { IErpHrmEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmEmployee";
import type { IErpHrmInvitation } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmInvitation";
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

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_erp_hrm_member_invitations_create } from "../../../generate/generate_random_erp_hrm_member_invitations_create";
import { generate_random_erp_hrm_member_projects_create } from "../../../generate/generate_random_erp_hrm_member_projects_create";
import { generate_random_erp_hrm_member_projects_members_create } from "../../../generate/generate_random_erp_hrm_member_projects_members_create";
import { prepare_random_erp_hrm_invitation } from "../../../prepare/prepare_random_erp_hrm_invitation";
import { prepare_random_erp_hrm_project_member } from "../../../prepare/prepare_random_erp_hrm_project_member";

export async function test_api_project_member_removal_by_manager(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create manager user with project:manage permission
  const managerConnection: api.IConnection = { host: connection.host };
  const manager = await authorize_member_join(managerConnection, {});
  typia.assert(manager);
  // 2. Create project to remove member from
  const project = await generate_random_erp_hrm_member_projects_create(
    managerConnection,
    {},
  );
  typia.assert(project);
  // 3. Create employee to be removed from project (via invitation)
  const employeeMemberConnection: api.IConnection = { host: connection.host };
  const employeeMember = await authorize_member_join(
    employeeMemberConnection,
    {},
  );
  typia.assert(employeeMember);
  // 4. Create invitation which creates employee record for existing member
  const invitation = await generate_random_erp_hrm_member_invitations_create(
    managerConnection,
    {
      body: {
        email: employeeMember.email,
      },
    },
  );
  typia.assert(invitation);
  // 5. Assign employee to project
  const memberShip =
    await generate_random_erp_hrm_member_projects_members_create(
      managerConnection,
      {
        params: {
          projectId: project.id,
        },
        body: typia.random<IErpHrmProjectMember.ICreate>(),
      },
    );
  typia.assert(memberShip);
  // 6. Remove employee from project (manager action)
  await api.functional.erpHrm.member.projects.members.erase(managerConnection, {
    projectId: project.id,
    memberId: memberShip.id,
  });
}
