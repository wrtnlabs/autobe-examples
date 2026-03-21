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
import type { IErpHrmTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimelog";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_erp_hrm_member_projects_create } from "../../../generate/generate_random_erp_hrm_member_projects_create";
import { generate_random_erp_hrm_member_timelogs_create } from "../../../generate/generate_random_erp_hrm_member_timelogs_create";
import { prepare_random_erp_hrm_project } from "../../../prepare/prepare_random_erp_hrm_project";
import { prepare_random_erp_hrm_timelog } from "../../../prepare/prepare_random_erp_hrm_timelog";

export async function test_api_project_deletion_with_timelogs_rejected(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as a member with project management permission
  const memberConnection: api.IConnection = { host: connection.host };
  const authResult = await authorize_member_join(memberConnection, {});
  typia.assert(authResult);
  // 2. Create a project that will have timelogs associated with it
  const project = await generate_random_erp_hrm_member_projects_create(
    memberConnection,
    {},
  );
  typia.assert(project);
  // 3. Create a timelog entry associated with this project
  // Project owners should be able to log time against projects they own
  const timelog = await generate_random_erp_hrm_member_timelogs_create(
    memberConnection,
    {
      body: {
        project_id: project.id,
      },
    },
  );
  typia.assert(timelog);
  // 4. Attempt to delete the project that has associated timelogs
  // This should fail with a 400 Bad Request error
  await TestValidator.httpError(
    "should reject project deletion when timelogs exist",
    400,
    async () => {
      await api.functional.erpHrm.member.projects.erase(memberConnection, {
        projectId: project.id,
      });
    },
  );
  // 5. Verify the project still exists by attempting to create another timelog
  // (which would fail if project didn't exist)
  const anotherTimelog = await generate_random_erp_hrm_member_timelogs_create(
    memberConnection,
    {
      body: {
        project_id: project.id,
      },
    },
  );
  typia.assert(anotherTimelog);
}
