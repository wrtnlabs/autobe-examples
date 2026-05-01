import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmDepartment";
import type { IErpHrmEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmEmployee";
import type { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
import type { IErpHrmProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmProject";
import type { IErpHrmRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmRole";
import type { IErpHrmTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTask";
import type { IErpHrmTimer } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimer";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_erp_hrm_timer } from "../prepare/prepare_random_erp_hrm_timer";

/**
 * Generate a random timer via the API for E2E testing.
 *
 * Prepares random timer creation data using the prepare function, then starts a live time tracking
 * session by calling the timer creation endpoint. The timer begins counting immediately from the
 * server-assigned start timestamp and runs until explicitly stopped or discarded.
 *
 * The project ID and task ID default to random UUIDs suitable for testing. The description defaults
 * to a short paragraph of realistic text. All properties accept DeepPartial overrides, allowing tests
 * to inject known project/task IDs or specific descriptions. The optional task ID and description can
 * also be explicitly set to null through the input to test null-handling paths.
 *
 * Only one active timer per employee is allowed. Attempting to start a second timer while one is
 * already running results in a 409 Conflict error. The employee must be a project member of the
 * specified project, and any provided task must belong to that project.
 */
export async function generate_random_erp_hrm_member_timers_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IErpHrmTimer.ICreate> | undefined;
  },
): Promise<IErpHrmTimer> {
  const prepared: IErpHrmTimer.ICreate = prepare_random_erp_hrm_timer(
    props.body,
  );
  const result: IErpHrmTimer = await api.functional.erpHrm.member.timers.create(
    connection,
    {
      body: prepared,
    },
  );
  return result;
}
