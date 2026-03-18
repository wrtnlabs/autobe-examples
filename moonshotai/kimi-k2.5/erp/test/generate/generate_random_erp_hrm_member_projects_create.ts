import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
import type { IErpHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmOrganization";
import type { IErpHrmProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmProject";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_erp_hrm_project } from "../prepare/prepare_random_erp_hrm_project";

export async function generate_random_erp_hrm_member_projects_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IErpHrmProject.ICreate> | undefined;
  },
): Promise<IErpHrmProject> {
  const prepared: IErpHrmProject.ICreate = prepare_random_erp_hrm_project(
    props.body,
  );
  const result: IErpHrmProject =
    await api.functional.erpHrm.member.projects.create(connection, {
      body: prepared,
    });
  return result;
}
