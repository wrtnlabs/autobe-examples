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
import type { IErpHrmTaskHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTaskHistory";
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
import { generate_random_erp_hrm_member_projects_tasks_create } from "../../../generate/generate_random_erp_hrm_member_projects_tasks_create";
import { generate_random_erp_hrm_member_timelogs_create } from "../../../generate/generate_random_erp_hrm_member_timelogs_create";
import { prepare_random_erp_hrm_project } from "../../../prepare/prepare_random_erp_hrm_project";
import { prepare_random_erp_hrm_task } from "../../../prepare/prepare_random_erp_hrm_task";
import { prepare_random_erp_hrm_timelog } from "../../../prepare/prepare_random_erp_hrm_timelog";

/**
 * Test timelog creation with task association.
 * Verifies that employees can log time against specific tasks within projects.
 */
export async function test_api_timelog_creation_with_task_association(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as member (creates first organization)
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {},
  });
  typia.assert(member);
  // 2. Create a project
  const project = await generate_random_erp_hrm_member_projects_create(
    memberConnection,
    {},
  );
  typia.assert(project);
  // 3. Create a task within the project
  const task = await generate_random_erp_hrm_member_projects_tasks_create(
    memberConnection,
    {
      params: {
        projectId: project.id,
      },
    },
  );
  typia.assert(task);
  // 4. Create a timelog with task association
  const timelogBody: IErpHrmTimelog.ICreate = {
    project_id: project.id,
    task_id: task.id,
    date: new Date().toISOString(),
    duration: typia.random<
      number & tags.Type<"int32"> & tags.Minimum<60> & tags.Maximum<480>
    >(),
    description: RandomGenerator.paragraph({ sentences: 3 }),
    billable: true,
  } satisfies IErpHrmTimelog.ICreate;
  const timelog = await api.functional.erpHrm.member.timelogs.create(
    memberConnection,
    {
      body: timelogBody,
    },
  );
  typia.assert(timelog);
  // 5. Verify timelog properties
  TestValidator.equals("project matches", timelog.project.id, project.id);
  TestValidator.predicate("task is associated", timelog.task !== null);
  TestValidator.equals("task id matches", timelog.task!.id, task.id);
  TestValidator.equals("task title matches", timelog.task!.title, task.title);
  TestValidator.equals(
    "duration matches",
    timelog.duration,
    timelogBody.duration,
  );
  TestValidator.equals(
    "billable status matches",
    timelog.billable,
    timelogBody.billable,
  );
  TestValidator.equals(
    "description matches",
    timelog.description,
    timelogBody.description,
  );
}
