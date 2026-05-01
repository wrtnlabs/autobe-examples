import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmDepartment";
import type { IErpHrmEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmEmployee";
import type { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
import type { IErpHrmProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmProject";
import type { IErpHrmRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmRole";
import type { IErpHrmTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTask";
import type { IErpHrmTaskHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTaskHistory";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_erp_hrm_task } from "../prepare/prepare_random_erp_hrm_task";

/**
 * Generate a random task within a project for E2E testing.
 *
 * Prepares random task data using the prepare function, then calls the task creation
 * endpoint. The task is created within the project specified by the required projectId
 * URL parameter. Returns the fully populated task entity including the generated id,
 * timestamps, and initial status.
 *
 * When body overrides are provided via DeepPartial input, specified values take
 * precedence over random defaults, allowing tests to pin relationships or attributes
 * while keeping other fields random.
 */
export async function generate_random_erp_hrm_member_projects_tasks_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IErpHrmTask.ICreate> | undefined;
    params: {
      projectId: string;
    };
  },
): Promise<IErpHrmTask> {
  const prepared: IErpHrmTask.ICreate = prepare_random_erp_hrm_task(props.body);
  return await api.functional.erpHrm.member.projects.tasks.create(connection, {
    body: prepared,
    projectId: props.params.projectId,
  });
}
