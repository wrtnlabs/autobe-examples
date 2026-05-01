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

import { prepare_random_erp_hrm_timesheet } from "../prepare/prepare_random_erp_hrm_timesheet";

/**
 * Generate a random ERP HRM timesheet for E2E testing.
 *
 * Creates a draft timesheet for the authenticated employee by preparing
 * random week_start_date data via the prepare function, then calling the
 * timesheet creation endpoint. The server auto-associates all ungrouped
 * timelogs within the Monday-to-Sunday week range with the new timesheet.
 *
 * The timesheet is created in draft status, allowing timelogs to be added
 * or removed before submission. Each employee may have at most one
 * timesheet per calendar week.
 *
 * The server enforces that week_start_date must fall on a Monday. Test
 * authors should override this value with a valid Monday date via
 * props.body when testing submission flows.
 */
export async function generate_random_erp_hrm_member_timesheets_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IErpHrmTimesheet.ICreate>;
  },
): Promise<IErpHrmTimesheet> {
  const prepared: IErpHrmTimesheet.ICreate = prepare_random_erp_hrm_timesheet(
    props.body,
  );
  const result: IErpHrmTimesheet =
    await api.functional.erpHrm.member.timesheets.create(connection, {
      body: prepared,
    });
  return result;
}
