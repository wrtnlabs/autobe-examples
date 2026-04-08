import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmTimeTrackDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackDepartment";
import type { IHrmTimeTrackEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackEmployee";
import type { IHrmTimeTrackMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackMember";
import type { IHrmTimeTrackOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackOrganization";
import type { IHrmTimeTrackProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackProject";
import type { IHrmTimeTrackRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackRole";
import type { IHrmTimeTrackTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackTask";
import type { IHrmTimeTrackTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackTimelog";
import type { IHrmTimeTrackTimesheet } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackTimesheet";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_hrm_time_track_timesheet } from "../prepare/prepare_random_hrm_time_track_timesheet";

/**
 * Generate a random HRM time track timesheet for E2E testing.
 *
 * Creates a new draft timesheet for the authenticated employee covering a specific week period.
 * The timesheet is created in draft status and automatically includes all timelogs that the
 * employee has logged during that week period. The week is identified by its start date
 * (Monday), and the end date (Sunday) is calculated automatically.
 *
 * This function uses the prepare function to generate random test data, allowing partial
 * customization through the props.body parameter. If no custom data is provided, a random
 * week_start_date will be generated as a valid ISO 8601 date-time string.
 */
export async function generate_random_hrm_time_track_member_timesheets_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IHrmTimeTrackTimesheet.ICreate> | undefined;
  },
): Promise<IHrmTimeTrackTimesheet> {
  const prepared: IHrmTimeTrackTimesheet.ICreate =
    prepare_random_hrm_time_track_timesheet(props.body);
  return await api.functional.hrmTimeTrack.member.timesheets.create(
    connection,
    {
      body: prepared,
    },
  );
}
