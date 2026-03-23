import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmTrackerDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTrackerDepartment";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_hrm_tracker_department } from "../prepare/prepare_random_hrm_tracker_department";

export async function generate_random_hrm_tracker_member_departments_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IHrmTrackerDepartment.ICreate> | undefined;
  },
): Promise<IHrmTrackerDepartment> {
  const prepared: IHrmTrackerDepartment.ICreate =
    prepare_random_hrm_tracker_department(props.body);
  const result: IHrmTrackerDepartment =
    await api.functional.hrmTracker.member.departments.create(connection, {
      body: prepared,
    });
  return result;
}
