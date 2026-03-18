import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmPlatformProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformProject";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_hrm_platform_project } from "../prepare/prepare_random_hrm_platform_project";

export async function generate_random_hrm_platform_member_projects_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IHrmPlatformProject.ICreate>;
  },
): Promise<IHrmPlatformProject> {
  const prepared: IHrmPlatformProject.ICreate =
    prepare_random_hrm_platform_project(props.body);
  const result: IHrmPlatformProject =
    await api.functional.hrmPlatform.member.projects.create(connection, {
      body: prepared,
    });
  return result;
}
