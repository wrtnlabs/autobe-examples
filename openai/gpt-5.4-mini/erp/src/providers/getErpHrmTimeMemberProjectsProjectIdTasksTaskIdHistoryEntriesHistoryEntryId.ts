import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IErpHrmTimeDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeDepartment";
import { IErpHrmTimeEmployeeDashboardSummary } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeEmployeeDashboardSummary";
import { IErpHrmTimeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeMember";
import { IErpHrmTimeOrganizationDashboardSummary } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeOrganizationDashboardSummary";
import { IErpHrmTimeProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeProject";
import { IErpHrmTimeRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeRole";
import { IErpHrmTimeTaskHistoryEntry } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeTaskHistoryEntry";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { ErpHrmTimeTaskHistoryEntryTransformer } from "../transformers/ErpHrmTimeTaskHistoryEntryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getErpHrmTimeMemberProjectsProjectIdTasksTaskIdHistoryEntriesHistoryEntryId(props: {
  member: MemberPayload;
  projectId: string & tags.Format<"uuid">;
  taskId: string & tags.Format<"uuid">;
  historyEntryId: string & tags.Format<"uuid">;
}): Promise<IErpHrmTimeTaskHistoryEntry> {
  const task = await MyGlobal.prisma.erp_hrm_time_tasks.findUniqueOrThrow({
    where: {
      id: props.taskId,
      erp_hrm_time_project_id: props.projectId,
    },
    select: {
      id: true,
      erp_hrm_time_project_id: true,
    },
  });
  if (task.erp_hrm_time_project_id !== props.projectId) {
    throw new HttpException("Not Found", 404);
  }
  const historyEntry =
    await MyGlobal.prisma.erp_hrm_time_task_history_entries.findUniqueOrThrow({
      where: {
        id: props.historyEntryId,
        erp_hrm_time_task_id: props.taskId,
      },
      ...ErpHrmTimeTaskHistoryEntryTransformer.select(),
    });
  return await ErpHrmTimeTaskHistoryEntryTransformer.transform(historyEntry);
}
