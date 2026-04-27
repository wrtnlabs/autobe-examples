import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmTimeTrackingDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingDepartment";
import type { IHrmTimeTrackingEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingEmployee";
import type { IHrmTimeTrackingMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingMember";
import type { IHrmTimeTrackingOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingOrganization";
import type { IHrmTimeTrackingProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingProject";
import type { IHrmTimeTrackingRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingRole";
import type { IHrmTimeTrackingTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingTask";
import type { IHrmTimeTrackingTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingTimelog";
import type { IHrmTimeTrackingTimesheet } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingTimesheet";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_hrm_time_tracking_timelog } from "../prepare/prepare_random_hrm_time_tracking_timelog";

/**
 * Generate a random HRM time tracking timelog via the API for E2E testing.
 *
 * Prepares random timelog creation data using the prepare function, then calls
 * the creation endpoint to persist the timelog. The authenticated employee is
 * inferred from the session — no employee reference is required in the input.
 *
 * Supports selective override of specific timelog fields through the optional
 * {@link props.body DeepPartial input}, allowing test scenarios to customize
 * date, duration, project, task, description, and billable flag as needed.
 *
 * @param connection - API connection configuration with authentication headers
 * @param props - Function parameters
 * @param props.body - Optional partial timelog creation data to override
 *                     specific generated values
 * @returns The complete created timelog record with all system-generated fields
 */
export async function generate_random_hrm_time_tracking_member_timelogs_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IHrmTimeTrackingTimelog.ICreate> | undefined;
  }
): Promise<IHrmTimeTrackingTimelog> {
  const prepared: IHrmTimeTrackingTimelog.ICreate = prepare_random_hrm_time_tracking_timelog(
    props.body,
  );
  return await api.functional.hrmTimeTracking.member.timelogs.create(
    connection,
    {
      body: prepared,
    },
  );
}
