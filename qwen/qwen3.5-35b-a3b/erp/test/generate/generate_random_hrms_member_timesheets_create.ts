import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmsEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsEmployee";
import type { IHrmsMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsMember";
import type { IHrmsProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsProject";
import type { IHrmsTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsTimelog";
import type { IHrmsTimesheet } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsTimesheet";
import type { IWeekRange } from "@ORGANIZATION/PROJECT-api/lib/structures/IWeekRange";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_hrms_timesheet } from "../prepare/prepare_random_hrms_timesheet";

export async function generate_random_hrms_member_timesheets_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IHrmsTimesheet.ICreate>;
  },
): Promise<IHrmsTimesheet> {
  const prepared: IHrmsTimesheet.ICreate = prepare_random_hrms_timesheet(
    props.body,
  );
  const result: IHrmsTimesheet =
    await api.functional.hrms.member.timesheets.create(connection, {
      body: prepared,
    });
  return result;
}
