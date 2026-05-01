import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmDepartment";
import type { IErpHrmEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmEmployee";
import type { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
import type { IErpHrmProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmProject";
import type { IErpHrmRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmRole";
import type { IErpHrmTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTask";
import type { IErpHrmTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimelog";
import type { IErpHrmTimesheet } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimesheet";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_erp_hrm_timelog } from "../prepare/prepare_random_erp_hrm_timelog";

/**
 * Generate a random timelog within a draft timesheet for E2E testing.
 *
 * Prepares random timelog data using the prepare function, then calls the creation endpoint to add the timelog to the specified draft timesheet. The timesheet must exist, be in draft status, and be owned by the same employee who will own the timelog.
 *
 * The generated timelog includes a random project assignment, optional task and employee assignments, a valid date within the timesheet's week range, a positive duration in minutes, an optional work description, and a billable flag. All fields can be overridden via the body parameter.
 *
 * @param connection API connection information
 * @param props.body Optional partial timelog creation data to override random defaults
 * @param props.params.timesheetId UUID of the draft timesheet to attach the timelog to
 * @returns The created timelog with all fields populated including the timesheet association
 */
export async function generate_random_erp_hrm_member_timesheets_timelogs_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IErpHrmTimelog.ICreate> | undefined;
    params: {
      timesheetId: string;
    };
  },
): Promise<IErpHrmTimelog> {
  const prepared: IErpHrmTimelog.ICreate = prepare_random_erp_hrm_timelog(
    props.body,
  );
  const result: IErpHrmTimelog =
    await api.functional.erpHrm.member.timesheets.timelogs.create(connection, {
      timesheetId: props.params.timesheetId,
      body: prepared,
    });
  return result;
}
