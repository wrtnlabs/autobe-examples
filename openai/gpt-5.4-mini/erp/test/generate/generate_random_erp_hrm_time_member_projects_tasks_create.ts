import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmTimeDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeDepartment";
import type { IErpHrmTimeEmployeeDashboardSummary } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeEmployeeDashboardSummary";
import type { IErpHrmTimeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeMember";
import type { IErpHrmTimeOrganizationDashboardSummary } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeOrganizationDashboardSummary";
import type { IErpHrmTimeProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeProject";
import type { IErpHrmTimeRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeRole";
import type { IErpHrmTimeTaskHistoryEntry } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeTaskHistoryEntry";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_erp_hrm_time_task_history_entry } from "../prepare/prepare_random_erp_hrm_time_task_history_entry";

export async function generate_random_erp_hrm_time_member_projects_tasks_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IErpHrmTimeTaskHistoryEntry.ICreate> | undefined;
    params: {
      projectId: string;
    };
  },
): Promise<IErpHrmTimeTaskHistoryEntry> {
  const prepared: IErpHrmTimeTaskHistoryEntry.ICreate =
    prepare_random_erp_hrm_time_task_history_entry(props.body);
  return await api.functional.erpHrmTime.member.projects.tasks.create(
    connection,
    {
      body: prepared,
      projectId: props.params.projectId,
    },
  );
}
