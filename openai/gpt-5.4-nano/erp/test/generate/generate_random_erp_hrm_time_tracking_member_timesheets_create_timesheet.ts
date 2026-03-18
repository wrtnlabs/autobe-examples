import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmTimeTrackingTimesheet } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeTrackingTimesheet";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_erp_hrm_time_tracking_timesheet } from "../prepare/prepare_random_erp_hrm_time_tracking_timesheet";

export async function generate_random_erp_hrm_time_tracking_member_timesheets_create_timesheet(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IErpHrmTimeTrackingTimesheet.ICreate> | undefined;
  },
): Promise<IErpHrmTimeTrackingTimesheet> {
  const prepared: IErpHrmTimeTrackingTimesheet.ICreate =
    prepare_random_erp_hrm_time_tracking_timesheet(props.body);
  return await api.functional.erpHrmTimeTracking.member.timesheets.createTimesheet(
    connection,
    {
      body: prepared,
    },
  );
}
