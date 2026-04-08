import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmDepartment";
import type { IHrmEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmEmployee";
import type { IHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmMember";
import type { IHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmOrganization";
import type { IHrmProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmProject";
import type { IHrmRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmRole";
import type { IHrmTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTask";
import type { IHrmTimeReportItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeReportItem";
import type { IHrmTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimelog";
import type { IHrmTimesheetTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimesheetTimelog";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_hrm_timesheet_timelog } from "../prepare/prepare_random_hrm_timesheet_timelog";

/**
 * Generate a random timesheet for an employee covering a specific week period.
 *
 * Prepares random timesheet data using the prepare function, then calls the creation endpoint to create a draft timesheet. The timesheet automatically includes all timelogs belonging to the specified employee for the given week (Monday to Sunday).
 *
 * @param connection The API connection object
 * @param props.body Optional partial input to override specific properties
 * @param props.params.organizationId UUID of the organization (required)
 * @returns The created timesheet record with all fields including calculated values
 */
export async function generate_random_hrm_member_organizations_timesheets_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IHrmTimesheetTimelog.ICreate>;
    params?: {
      organizationId: string;
    };
  },
): Promise<IHrmTimesheetTimelog> {
  const prepared: IHrmTimesheetTimelog.ICreate =
    prepare_random_hrm_timesheet_timelog(props.body);
  const result: IHrmTimesheetTimelog =
    await api.functional.hrm.member.organizations.timesheets.create(
      connection,
      {
        organizationId: props.params?.organizationId!,
        body: prepared,
      },
    );
  return result;
}
