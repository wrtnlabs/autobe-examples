import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmPlatformDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformDepartment";
import type { IHrmPlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganization";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_hrm_platform_department } from "../prepare/prepare_random_hrm_platform_department";

export async function generate_random_hrm_platform_member_departments_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IHrmPlatformDepartment.ICreate> | undefined;
  },
): Promise<IHrmPlatformDepartment> {
  const prepared: IHrmPlatformDepartment.ICreate =
    prepare_random_hrm_platform_department(props.body);
  const result: IHrmPlatformDepartment =
    await api.functional.hrmPlatform.member.departments.create(connection, {
      body: prepared,
    });
  return result;
}
