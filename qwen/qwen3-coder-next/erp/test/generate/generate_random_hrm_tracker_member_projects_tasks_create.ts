import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmTrackerEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTrackerEmployee";
import type { IHrmTrackerMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTrackerMember";
import type { IHrmTrackerOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTrackerOrganization";
import type { IHrmTrackerProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTrackerProject";
import type { IHrmTrackerTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTrackerTask";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_hrm_tracker_task } from "../prepare/prepare_random_hrm_tracker_task";

export async function generate_random_hrm_tracker_member_projects_tasks_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IHrmTrackerTask.ICreate>;
    params: {
      projectId: string;
    };
  },
): Promise<IHrmTrackerTask> {
  const prepared: IHrmTrackerTask.ICreate = prepare_random_hrm_tracker_task(
    props.body,
  );
  return await api.functional.hrmTracker.member.projects.tasks.create(
    connection,
    {
      body: prepared,
      projectId: props.params.projectId,
    },
  );
}
