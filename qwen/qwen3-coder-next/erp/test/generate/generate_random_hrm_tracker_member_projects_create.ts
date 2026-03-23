import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmTrackerOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTrackerOrganization";
import type { IHrmTrackerProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTrackerProject";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_hrm_tracker_project } from "../prepare/prepare_random_hrm_tracker_project";

export async function generate_random_hrm_tracker_member_projects_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IHrmTrackerProject.ICreate> | undefined;
  },
): Promise<IHrmTrackerProject> {
  const prepared: IHrmTrackerProject.ICreate =
    prepare_random_hrm_tracker_project(props.body);
  return await api.functional.hrmTracker.member.projects.create(connection, {
    body: prepared,
  });
}
