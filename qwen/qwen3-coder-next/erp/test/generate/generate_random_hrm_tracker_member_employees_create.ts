import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmTrackerEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTrackerEmployee";
import type { IHrmTrackerMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTrackerMember";
import type { IHrmTrackerOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTrackerOrganization";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_hrm_tracker_employee } from "../prepare/prepare_random_hrm_tracker_employee";

export async function generate_random_hrm_tracker_member_employees_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IHrmTrackerEmployee.ICreate> | undefined;
  },
): Promise<IHrmTrackerEmployee> {
  const prepared: IHrmTrackerEmployee.ICreate =
    prepare_random_hrm_tracker_employee(props.body);
  return await api.functional.hrmTracker.member.employees.create(connection, {
    body: prepared,
  });
}
