import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmTimeOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeOrganization";
import type { IErpHrmTimeProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeProject";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_erp_hrm_time_project } from "../prepare/prepare_random_erp_hrm_time_project";

export async function generate_random_erp_hrm_time_member_projects_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IErpHrmTimeProject.ICreate> | undefined;
  },
): Promise<IErpHrmTimeProject> {
  const prepared: IErpHrmTimeProject.ICreate =
    prepare_random_erp_hrm_time_project(props.body);
  return await api.functional.erpHrmTime.member.projects.create(connection, {
    body: prepared,
  });
}
