import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmsEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsEmployee";
import type { IHrmsProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsProject";
import type { IHrmsTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsTask";
import type { IHrmsTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsTimelog";
import type { IHrmsTimer } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsTimer";
import type { IHrmsTopEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsTopEmployee";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_hrms_project } from "../prepare/prepare_random_hrms_project";

export async function generate_random_hrms_member_organizations_projects_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IHrmsProject.ICreate> | undefined;
    params: {
      organizationId: string;
    };
  },
): Promise<IHrmsProject> {
  const prepared: IHrmsProject.ICreate = prepare_random_hrms_project(
    props.body,
  );
  return await api.functional.hrms.member.organizations.projects.create(
    connection,
    {
      body: prepared,
      organizationId: props.params.organizationId,
    },
  );
}
