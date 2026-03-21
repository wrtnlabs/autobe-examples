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

export async function test_api_project_membership_not_found_scenario(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin authentication
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {});
  // 2. Create project
  const project = await generate_random_erp_hrm_admin_projects_create(
    adminConnection,
    {
      body: {
        name: RandomGenerator.paragraph({ sentences: 1 }),
        color: "#FF5733" satisfies string & tags.Pattern<"^#[0-9A-Fa-f]{6}$">,
        status: "active",
      },
    },
  );
  typia.assert(project);
  // 3. Create valid project membership
  const validMember =
    await generate_random_erp_hrm_admin_projects_members_create(
      adminConnection,
      {
        params: { projectId: project.id },
      },
    );
  typia.assert(validMember);
  // 4. Generate random UUID that doesn't exist as a membership
  const nonExistentMemberId = typia.random<string & tags.Format<"uuid">>();
  // 5. Attempt to retrieve non-existent membership and verify 404 error
  await TestValidator.httpError(
    "non-existent memberId should return 404",
    404,
    async () =>
      await api.functional.erpHrm.admin.projects.members.at(adminConnection, {
        projectId: project.id,
        memberId: nonExistentMemberId,
      }),
  );
  // 6. Verify valid membership is still accessible
  const existingMember = await api.functional.erpHrm.admin.projects.members.at(
    adminConnection,
    {
      projectId: project.id,
      memberId: validMember.id,
    },
  );
  typia.assert(existingMember);
  TestValidator.equals(
    "valid membership should still exist",
    existingMember.id,
    validMember.id,
  );
}
