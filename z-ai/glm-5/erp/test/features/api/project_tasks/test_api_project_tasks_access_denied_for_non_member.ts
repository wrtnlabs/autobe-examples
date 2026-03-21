import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmDepartment";
import type { IErpHrmEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmEmployee";
import type { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
import type { IErpHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmOrganization";
import type { IErpHrmProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmProject";
import type { IErpHrmRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmRole";
import type { IErpHrmTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTask";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIErpHrmTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIErpHrmTask";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_erp_hrm_member_projects_create } from "../../../generate/generate_random_erp_hrm_member_projects_create";
import { prepare_random_erp_hrm_project } from "../../../prepare/prepare_random_erp_hrm_project";

export async function test_api_project_tasks_access_denied_for_non_member(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create Member A (owner with full permissions including project:manage)
  const memberAConnection: api.IConnection = { host: connection.host };
  const memberA = await authorize_member_join(memberAConnection, {});
  typia.assert(memberA);
  // 2. Create a project as Member A
  const project = await generate_random_erp_hrm_member_projects_create(
    memberAConnection,
    {},
  );
  typia.assert(project);
  // 3. Create Member B (different member, different organization)
  // Member B creates their own organization but has no employee record
  // in Member A's organization, hence no access to Member A's projects
  const memberBConnection: api.IConnection = { host: connection.host };
  const memberB = await authorize_member_join(memberBConnection, {});
  typia.assert(memberB);
  // 4. Member B attempts to access Member A's project task list
  // Should be denied because Member B:
  // - Is not a member of Member A's project (no record in erp_hrm_project_members)
  // - Does not have project:manage permission in Member A's organization
  //   (no employee record in that organization)
  await TestValidator.error(
    "Member B should be denied access to Member A's project tasks",
    async () => {
      await api.functional.erpHrm.member.projects.tasks.index(
        memberBConnection,
        {
          projectId: project.id,
          body: {},
        },
      );
    },
  );
}
