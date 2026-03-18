import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmPlatformDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformDepartment";
import type { IHrmPlatformEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformEmployee";
import type { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import type { IHrmPlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganization";
import type { IHrmPlatformRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformRole";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_hrm_platform_employee } from "../prepare/prepare_random_hrm_platform_employee";

export async function generate_random_hrm_platform_member_employees_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IHrmPlatformEmployee.ICreate>;
  },
): Promise<IHrmPlatformEmployee> {
  const prepared: IHrmPlatformEmployee.ICreate =
    prepare_random_hrm_platform_employee(props.body);
  const result: IHrmPlatformEmployee =
    await api.functional.hrmPlatform.member.employees.create(connection, {
      body: prepared,
    });
  return result;
}
