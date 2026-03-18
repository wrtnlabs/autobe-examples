import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmsEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsEmployee";
import type { IHrmsProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsProject";
import type { IHrmsProjectMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsProjectMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_hrms_project_member } from "../prepare/prepare_random_hrms_project_member";

export async function generate_random_hrms_member_projects_members_add_member(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IHrmsProjectMember.ICreate> | undefined;
    params: {
      projectId: string;
    };
  },
): Promise<IHrmsProjectMember> {
  const prepared: IHrmsProjectMember.ICreate =
    prepare_random_hrms_project_member(props.body);
  return await api.functional.hrms.member.projects.members.addMember(
    connection,
    {
      body: prepared,
      projectId: props.params.projectId,
    },
  );
}
