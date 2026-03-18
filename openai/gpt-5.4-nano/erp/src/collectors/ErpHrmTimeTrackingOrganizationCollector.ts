import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IErpHrmTimeTrackingOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeTrackingOrganization";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace ErpHrmTimeTrackingOrganizationCollector {
  export async function collect(props: {
    body: IErpHrmTimeTrackingOrganization.ICreate;
  }) {
    const id: string = v4();
    const now = new Date();
    return {
      id,
      name: props.body.name,
      description: props.body.description,
      logo_url: props.body.logo_url ?? null,
      currency_code: props.body.currency_code,
      timezone: props.body.timezone,
      fiscal_start_month: props.body.fiscal_start_month,
      created_at: now,
      updated_at: now,
      deleted_at: null,
      departments: undefined,
      contracts: undefined,
      contractSnapshots: undefined,
      projects: undefined,
      timelogs: undefined,
      timesheets: undefined,
      timerSessions: undefined,
      activityLogEntries: undefined,
      activityLogEntrySnapshots: undefined,
      reportDefinitions: undefined,
    } satisfies Prisma.erp_hrm_time_tracking_organizationsCreateInput;
  }
}
