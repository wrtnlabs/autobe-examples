import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmTimeTrackingProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeTrackingProject";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_erp_hrm_time_tracking_project } from "../prepare/prepare_random_erp_hrm_time_tracking_project";

export async function generate_random_erp_hrm_time_tracking_member_projects_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IErpHrmTimeTrackingProject.ICreate> | undefined;
  },
): Promise<IErpHrmTimeTrackingProject> {
  const prepared: IErpHrmTimeTrackingProject.ICreate =
    prepare_random_erp_hrm_time_tracking_project(props.body);
  return await api.functional.erpHrmTimeTracking.member.projects.create(
    connection,
    {
      body: prepared,
    },
  );
}
