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

export async function test_api_project_tasks_list_by_manager(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member account with owner role (has project:manage permission)
  const ownerConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(ownerConnection, {});
  typia.assert(member);
  // 2. Create a project within the organization
  const project = await generate_random_erp_hrm_member_projects_create(
    ownerConnection,
    {},
  );
  typia.assert(project);
  // 3. Call the tasks list endpoint with the created project's ID
  const tasksPage = await api.functional.erpHrm.member.projects.tasks.index(
    ownerConnection,
    {
      projectId: project.id,
      body: {} satisfies IErpHrmTask.IRequest,
    },
  );
  typia.assert(tasksPage);
  // 4. Validate pagination metadata
  TestValidator.predicate(
    "current page >= 1",
    tasksPage.pagination.current >= 1,
  );
  TestValidator.predicate(
    "limit within 1-100 range",
    tasksPage.pagination.limit >= 1 && tasksPage.pagination.limit <= 100,
  );
  TestValidator.predicate("records >= 0", tasksPage.pagination.records >= 0);
  TestValidator.predicate("pages >= 0", tasksPage.pagination.pages >= 0);
  // 5. Validate that data is an array
  TestValidator.predicate("data is array", Array.isArray(tasksPage.data));
  // 6. Validate task summary fields if any tasks exist
  if (tasksPage.data.length > 0) {
    for (const task of tasksPage.data) {
      typia.assert(task);
    }
  }
}
