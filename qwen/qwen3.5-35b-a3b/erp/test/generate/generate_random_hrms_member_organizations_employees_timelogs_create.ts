import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmsProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsProject";
import type { IHrmsTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsTimelog";
import type { IWeekRange } from "@ORGANIZATION/PROJECT-api/lib/structures/IWeekRange";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_hrms_timelog } from "../prepare/prepare_random_hrms_timelog";

export async function generate_random_hrms_member_organizations_employees_timelogs_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IHrmsTimelog.ICreate> | undefined;
    params: {
      organizationId: string;
      employeeId: string;
    };
  },
): Promise<IHrmsTimelog> {
  const prepared: IHrmsTimelog.ICreate = prepare_random_hrms_timelog(
    props.body,
  );
  const result: IHrmsTimelog =
    await api.functional.hrms.member.organizations.employees.timelogs.create(
      connection,
      {
        body: prepared,
        organizationId: props.params.organizationId,
        employeeId: props.params.employeeId,
      },
    );
  return result;
}
