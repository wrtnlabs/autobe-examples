import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmsEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsEmployee";
import type { IHrmsProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsProject";
import type { IHrmsTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsTask";
import type { IHrmsTimer } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsTimer";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_hrms_timer } from "../prepare/prepare_random_hrms_timer";

export async function generate_random_hrms_member_timers_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IHrmsTimer.ICreate> | undefined;
  },
): Promise<IHrmsTimer> {
  const prepared: IHrmsTimer.ICreate = prepare_random_hrms_timer(props.body);
  const result: IHrmsTimer = await api.functional.hrms.member.timers.create(
    connection,
    {
      body: prepared,
    },
  );
  return result;
}
