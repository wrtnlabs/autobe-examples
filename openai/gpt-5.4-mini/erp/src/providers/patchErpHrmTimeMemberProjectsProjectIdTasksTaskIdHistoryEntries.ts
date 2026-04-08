import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IErpHrmTimeDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeDepartment";
import { IErpHrmTimeEmployeeDashboardSummary } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeEmployeeDashboardSummary";
import { IErpHrmTimeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeMember";
import { IErpHrmTimeOrganizationDashboardSummary } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeOrganizationDashboardSummary";
import { IErpHrmTimeProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeProject";
import { IErpHrmTimeRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeRole";
import { IErpHrmTimeTaskHistoryEntry } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeTaskHistoryEntry";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIErpHrmTimeTaskHistoryEntry } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIErpHrmTimeTaskHistoryEntry";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { ErpHrmTimeTaskHistoryEntryAtSummaryTransformer } from "../transformers/ErpHrmTimeTaskHistoryEntryAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchErpHrmTimeMemberProjectsProjectIdTasksTaskIdHistoryEntries(props: {
  member: MemberPayload;
  projectId: string & tags.Format<"uuid">;
  taskId: string & tags.Format<"uuid">;
  body: IErpHrmTimeTaskHistoryEntry.IRequest;
}): Promise<IPageIErpHrmTimeTaskHistoryEntry.ISummary> {
  await MyGlobal.prisma.erp_hrm_time_tasks.findFirstOrThrow({
    where: {
      id: props.taskId,
      erp_hrm_time_project_id: props.projectId,
      deleted_at: null,
    },
    select: {
      id: true,
    },
  });
  const page: number = props.body.page;
  const limit: number =
    props.body.limit === null || props.body.limit === undefined
      ? props.body.pageSize
      : Math.min(props.body.limit, props.body.pageSize);
  const skip: number = (page - 1) * limit;
  const where: Prisma.erp_hrm_time_task_history_entriesWhereInput = {
    erp_hrm_time_task_id: props.taskId,
    ...(props.body.status === undefined ? {} : { status: props.body.status }),
    ...(props.body.priority === undefined
      ? {}
      : { priority: props.body.priority }),
    ...(props.body.employeeId === undefined
      ? {}
      : { erp_hrm_time_employee_id: props.body.employeeId }),
  };
  const data = await MyGlobal.prisma.erp_hrm_time_task_history_entries.findMany(
    {
      where,
      skip,
      take: limit,
      orderBy: {
        changed_at: "asc",
      },
      ...ErpHrmTimeTaskHistoryEntryAtSummaryTransformer.select(),
    },
  );
  const records = await MyGlobal.prisma.erp_hrm_time_task_history_entries.count(
    {
      where,
    },
  );
  return {
    pagination: {
      current: page,
      limit,
      records,
      pages: Math.ceil(records / limit),
    },
    data: await ErpHrmTimeTaskHistoryEntryAtSummaryTransformer.transformAll(
      data,
    ),
  };
}
