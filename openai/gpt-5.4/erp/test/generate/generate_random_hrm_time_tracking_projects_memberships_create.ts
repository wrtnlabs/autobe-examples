import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmTimeTrackingEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingEmployee";
import type { IHrmTimeTrackingOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingOrganization";
import type { IHrmTimeTrackingProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingProject";
import type { IHrmTimeTrackingProjectMembership } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingProjectMembership";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_hrm_time_tracking_project_membership } from "../prepare/prepare_random_hrm_time_tracking_project_membership";

export async function generate_random_hrm_time_tracking_projects_memberships_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IHrmTimeTrackingProjectMembership.ICreate> | undefined;
    params: {
      projectId: string;
    };
  },
): Promise<IHrmTimeTrackingProjectMembership> {
  const prepared: IHrmTimeTrackingProjectMembership.ICreate =
    prepare_random_hrm_time_tracking_project_membership(props.body);
  const result: IHrmTimeTrackingProjectMembership =
    await api.functional.hrmTimeTracking.projects.memberships.create(
      connection,
      {
        body: prepared,
        projectId: props.params.projectId,
      },
    );
  return result;
}
