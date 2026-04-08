import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmProjectMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmProjectMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_erp_hrm_project_member } from "../prepare/prepare_random_erp_hrm_project_member";

export async function generate_random_erp_hrm_admin_projects_members_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IErpHrmProjectMember.ICreate>;
    params: {
      projectId: string;
    };
  },
): Promise<IErpHrmProjectMember> {
  const prepared: IErpHrmProjectMember.ICreate =
    prepare_random_erp_hrm_project_member(props.body);
  const result: IErpHrmProjectMember =
    await api.functional.erpHrm.admin.projects.members.create(connection, {
      projectId: props.params.projectId,
      body: prepared,
    });
  return result;
}
