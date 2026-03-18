import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmDepartment";
import type { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
import type { IErpHrmOrganizationMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmOrganizationMember";
import type { IErpHrmProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmProject";
import type { IErpHrmProjectMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmProjectMember";
import type { IErpHrmRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmRole";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_erp_hrm_project_member } from "../prepare/prepare_random_erp_hrm_project_member";

export async function generate_random_erp_hrm_member_projects_members_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IErpHrmProjectMember.ICreate>;
    params?: {
      projectId: string;
    };
  },
): Promise<IErpHrmProjectMember> {
  const prepared: IErpHrmProjectMember.ICreate =
    prepare_random_erp_hrm_project_member(props.body);
  const result: IErpHrmProjectMember =
    await api.functional.erpHrm.member.projects.members.create(connection, {
      projectId: (props.params?.projectId ?? typia.random<string & tags.Format<"uuid">>()) satisfies string as string & tags.Format<"uuid">,
      body: prepared,
    });
  return result;
}