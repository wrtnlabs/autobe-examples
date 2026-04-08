import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmActiveTimer } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmActiveTimer";
import type { IHrmDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmDepartment";
import type { IHrmEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmEmployee";
import type { IHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmMember";
import type { IHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmOrganization";
import type { IHrmProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmProject";
import type { IHrmRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmRole";
import type { IHrmTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTask";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_hrm_active_timer } from "../prepare/prepare_random_hrm_active_timer";

/**
 * Generate a random active timer session via the API for E2E testing.
 *
 * Prepares random timer data using the prepare function, then calls the creation endpoint to start a live time tracking session for the authenticated employee.
 *
 * This function creates an active timer that tracks work duration in real-time. The timer must be associated with a project, and optionally can include a task and description for more granular tracking.
 *
 * **Business Rules**
 *
 * - Each employee can have at most one active timer at a time (will fail with 409 Conflict if already running)
 * - Project selection is required (projectId must be provided)
 * - Task selection is optional (taskId may be omitted or null)
 * - The employee must be active to start a timer
 *
 * @param connection The API connection with authentication context
 * @param props.body Optional partial timer creation data to override random defaults
 * @returns The created active timer record with start_timestamp and all session details
 */
export async function generate_random_hrm_member_active_timers_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IHrmActiveTimer.ICreate> | undefined;
  },
): Promise<IHrmActiveTimer> {
  const prepared: IHrmActiveTimer.ICreate = prepare_random_hrm_active_timer(
    props.body,
  );
  const result: IHrmActiveTimer =
    await api.functional.hrm.member.active_timers.create(connection, {
      body: prepared,
    });
  return result;
}
