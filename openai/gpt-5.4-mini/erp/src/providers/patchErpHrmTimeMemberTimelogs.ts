import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IErpHrmTimeDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeDepartment";
import { IErpHrmTimeEmployeeDashboardSummary } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeEmployeeDashboardSummary";
import { IErpHrmTimeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeMember";
import { IErpHrmTimeOrganizationDashboardSummary } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeOrganizationDashboardSummary";
import { IErpHrmTimeProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeProject";
import { IErpHrmTimeRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeRole";
import { IErpHrmTimeTaskHistoryEntry } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeTaskHistoryEntry";
import { IErpHrmTimeTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeTimelog";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIErpHrmTimeTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIErpHrmTimeTimelog";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { ErpHrmTimeTimelogAtSummaryTransformer } from "../transformers/ErpHrmTimeTimelogAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchErpHrmTimeMemberTimelogs(props: {
  member: MemberPayload;
  body: IErpHrmTimeTimelog.IRequest;
}): Promise<IPageIErpHrmTimeTimelog.ISummary> {
  const page: number = props.body.page ?? 1;
  const limit: number = props.body.limit ?? 100;
  const skip: number = (page - 1) * limit;
  const workDateFrom = props.body.workDateFrom;
  const workDateTo = props.body.workDateTo;
  const projectId = props.body.projectId;
  const taskId = props.body.taskId;
  const where: Prisma.erp_hrm_time_timelogsWhereInput = {
    deleted_at: null,
    ...(workDateFrom !== undefined || workDateTo !== undefined
      ? {
          work_date: {
            ...(workDateFrom !== undefined && workDateFrom !== null
              ? {
                  gte: new Date(workDateFrom),
                }
              : {}),
            ...(workDateTo !== undefined && workDateTo !== null
              ? {
                  lte: new Date(workDateTo),
                }
              : {}),
          },
        }
      : {}),
    ...(projectId !== undefined && projectId !== null
      ? { erp_hrm_time_project_id: projectId }
      : {}),
    ...(taskId !== undefined && taskId !== null
      ? { erp_hrm_time_task_id: taskId }
      : {}),
    ...(props.body.billable !== undefined && props.body.billable !== null
      ? { billable: props.body.billable }
      : {}),
    ...(props.body.search !== undefined
      ? {
          OR: [
            {
              description: { contains: props.body.search, mode: "insensitive" },
            },
          ],
        }
      : {}),
  };
  const data = await MyGlobal.prisma.erp_hrm_time_timelogs.findMany({
    where,
    orderBy: [{ work_date: "desc" }, { created_at: "desc" }, { id: "desc" }],
    skip,
    take: limit,
    ...ErpHrmTimeTimelogAtSummaryTransformer.select(),
  });
  const total: number = await MyGlobal.prisma.erp_hrm_time_timelogs.count({
    where,
  });
  return {
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
    data: await ArrayUtil.asyncMap(
      data,
      ErpHrmTimeTimelogAtSummaryTransformer.transform,
    ),
  };
}
