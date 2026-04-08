import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import { IHrmPlatformTaskHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformTaskHistory";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIHrmPlatformTaskHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmPlatformTaskHistory";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { HrmPlatformTaskHistoryAtSummaryTransformer } from "../transformers/HrmPlatformTaskHistoryAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchHrmPlatformMemberProjectsProjectIdTasksTaskIdHistories(props: {
  member: MemberPayload;
  projectId: string & tags.Format<"uuid">;
  taskId: string & tags.Format<"uuid">;
  body: IHrmPlatformTaskHistory.IRequest;
}): Promise<IPageIHrmPlatformTaskHistory.ISummary> {
  const page = props.body.page ?? 1;
  const limit = Math.min(props.body.limit ?? 20, 100);
  const skip = (page - 1) * limit;
  const projectMember =
    await MyGlobal.prisma.hrm_platform_project_members.findFirst({
      where: {
        hrm_platform_project_id: props.projectId,
        hrm_platform_employee_id: props.member.id,
      },
    });
  if (!projectMember) {
    throw new HttpException("Forbidden", 403);
  }
  await MyGlobal.prisma.hrm_platform_tasks.findUniqueOrThrow({
    where: {
      id: props.taskId,
      hrm_platform_project_id: props.projectId,
    },
  });
  const whereInput: Prisma.hrm_platform_task_historiesWhereInput = {
    hrm_platform_task_id: props.taskId,
    ...(props.body.oldStatus !== undefined && {
      old_status: props.body.oldStatus,
    }),
    ...(props.body.newStatus !== undefined && {
      new_status: props.body.newStatus,
    }),
    ...(props.body.memberId !== undefined && {
      hrm_platform_member_id: props.body.memberId,
    }),
    ...(props.body.dateFrom !== undefined || props.body.dateTo !== undefined
      ? {
          created_at: {
            ...(props.body.dateFrom !== undefined && {
              gte: new Date(props.body.dateFrom),
            }),
            ...(props.body.dateTo !== undefined && {
              lte: new Date(props.body.dateTo),
            }),
          },
        }
      : {}),
  } satisfies Prisma.hrm_platform_task_historiesWhereInput;
  const orderByInput: Prisma.hrm_platform_task_historiesOrderByWithRelationInput =
    {
      created_at: props.body.order ?? "desc",
    } satisfies Prisma.hrm_platform_task_historiesOrderByWithRelationInput;
  const data = await MyGlobal.prisma.hrm_platform_task_histories.findMany({
    where: whereInput,
    skip,
    take: limit,
    orderBy: orderByInput,
    ...HrmPlatformTaskHistoryAtSummaryTransformer.select(),
  });
  const total = await MyGlobal.prisma.hrm_platform_task_histories.count({
    where: whereInput,
  });
  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
    data: await ArrayUtil.asyncMap(
      data,
      HrmPlatformTaskHistoryAtSummaryTransformer.transform,
    ),
  };
}
