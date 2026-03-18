import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmTimeTrackingOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingOrganization";
import type { IHrmTimeTrackingProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingProject";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_hrm_time_tracking_project } from "../prepare/prepare_random_hrm_time_tracking_project";

export async function generate_random_hrm_time_tracking_projects_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IHrmTimeTrackingProject.ICreate> | undefined;
  },
): Promise<IHrmTimeTrackingProject> {
  const prepared: IHrmTimeTrackingProject.ICreate =
    prepare_random_hrm_time_tracking_project(props.body);
  return await api.functional.hrmTimeTracking.projects.create(connection, {
    body: prepared,
  });
}
