import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmDepartment";
import type { IErpHrmEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmEmployee";
import type { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
import type { IErpHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmOrganization";
import type { IErpHrmProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmProject";
import type { IErpHrmProjectMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmProjectMember";
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

/**
 * Test that non-project members receive 403 Forbidden when attempting to list tasks.
 *
 * Validates the authorization boundary for task visibility within projects. Only project members and users with elevated project permissions (project:manage, project:view) are allowed to list tasks. Non-members who attempt to access project tasks must receive a 403 Forbidden response.
 *
 * 1. Member A creates a new project they own.
 * 2. Member B (unrelated to the project) attempts to list tasks on Member A's project.
 * 3. Verifies the response is 403 Forbidden, confirming non-members are denied access.
 */
export async function test_api_task_list_non_project_member_receives_403(
  connection: api.IConnection,
): Promise<void> {
  // 1. Member A joins and creates a project
  const memberAConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberAConnection, {});
  const project = await generate_random_erp_hrm_member_projects_create(
    memberAConnection,
    {},
  );
  // 2. Member B joins (not added to Member A's project)
  const memberBConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberBConnection, {});
  // 3. Member B attempts to list tasks on Member A's project - must receive 403
  await TestValidator.httpError(
    "non-project member cannot list tasks",
    403,
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
