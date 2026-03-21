import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
import { IErpHrmTaskHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTaskHistory";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIErpHrmTaskHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIErpHrmTaskHistory";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { ErpHrmTaskHistoryTransformer } from "../transformers/ErpHrmTaskHistoryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchErpHrmMemberProjectsProjectIdTasksTaskIdHistories(props: {
  member: MemberPayload;
  projectId: string & tags.Format<"uuid">;
  taskId: string & tags.Format<"uuid">;
  body: IErpHrmTaskHistory.IRequest;
}): Promise<IPageIErpHrmTaskHistory> {
  const task = await MyGlobal.prisma.erp_hrm_tasks.findUniqueOrThrow({
    where: { id: props.taskId },
    select: {
      id: true,
      erp_hrm_project_id: true,
    },
  });
  if (task.erp_hrm_project_id !== props.projectId) {
    throw new HttpException(
      "Task does not belong to the specified project",
      400,
    );
  }
  const limit = props.body.limit ?? 20;
  const page = props.body.page ?? 1;
  const skip = (page - 1) * limit;
  const whereInput = {
    erp_hrm_task_id: props.taskId,
    ...(props.body.previous_status && {
      previous_status: props.body.previous_status,
    }),
    ...(props.body.new_status && { new_status: props.body.new_status }),
    ...(props.body.created_at_after &&
      props.body.created_at_before && {
        created_at: {
          gt: new Date(props.body.created_at_after),
          lt: new Date(props.body.created_at_before),
        },
      }),
    ...(props.body.created_at_after &&
      !props.body.created_at_before && {
        created_at: { gt: new Date(props.body.created_at_after) },
      }),
    ...(props.body.created_at_before &&
      !props.body.created_at_after && {
        created_at: { lt: new Date(props.body.created_at_before) },
      }),
  } satisfies Prisma.erp_hrm_task_historiesWhereInput;
  const cursorWhereInput = props.body.cursor
    ? {
        ...whereInput,
        created_at: { gt: new Date(props.body.cursor) },
      }
    : whereInput;
  const data = await MyGlobal.prisma.erp_hrm_task_histories.findMany({
    where: cursorWhereInput,
    take: limit,
    skip: props.body.cursor ? 0 : skip,
    orderBy: { created_at: "asc" },
    ...ErpHrmTaskHistoryTransformer.select(),
  });
  const total = await MyGlobal.prisma.erp_hrm_task_histories.count({
    where: whereInput,
  });
  return {
    data: await ArrayUtil.asyncMap(
      data,
      ErpHrmTaskHistoryTransformer.transform,
    ),
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
