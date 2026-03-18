import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmPlatformDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformDepartment";
import type { IHrmPlatformEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformEmployee";
import type { IHrmPlatformProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformProject";
import type { IHrmPlatformProjectMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformProjectMember";
import type { IHrmPlatformRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformRole";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_hrm_platform_project_member } from "../prepare/prepare_random_hrm_platform_project_member";

export async function generate_random_hrm_platform_member_projects_members_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IHrmPlatformProjectMember.ICreate>;
    params: {
      projectId: string;
    };
  },
): Promise<IHrmPlatformProjectMember> {
  const prepared: IHrmPlatformProjectMember.ICreate =
    prepare_random_hrm_platform_project_member(props.body);
  const result: IHrmPlatformProjectMember =
    await api.functional.hrmPlatform.member.projects.members.create(
      connection,
      {
        body: prepared,
        projectId: props.params.projectId,
      },
    );
  return result;
}
