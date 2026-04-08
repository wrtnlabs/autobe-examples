import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmTimeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeMember";
import type { IErpHrmTimeOrganizationDashboardSummary } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeOrganizationDashboardSummary";
import type { IErpHrmTimeProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeProject";
import type { IErpHrmTimeTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeTask";
import type { IErpHrmTimeTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeTimelog";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_erp_hrm_time_timelog } from "../prepare/prepare_random_erp_hrm_time_timelog";

export async function generate_random_erp_hrm_time_member_timelogs_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IErpHrmTimeTimelog.ICreate> | undefined;
  },
): Promise<IErpHrmTimeTimelog> {
  const prepared: IErpHrmTimeTimelog.ICreate =
    prepare_random_erp_hrm_time_timelog(props.body);
  return await api.functional.erpHrmTime.member.timelogs.create(connection, {
    body: prepared,
  });
}
