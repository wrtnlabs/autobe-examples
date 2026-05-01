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
import { ErpHrmTaskHistoryAtSummaryTransformer } from "../transformers/ErpHrmTaskHistoryAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchErpHrmMemberProjectsProjectIdTasksTaskIdHistories(props: {
  member: MemberPayload;
  projectId: string & tags.Format<"uuid">;
  taskId: string & tags.Format<"uuid">;
  body: IErpHrmTaskHistory.IRequest;
}): Promise<IPageIErpHrmTaskHistory.ISummary> {
  // 1. Verify task exists, belongs to project, and is not soft-deleted
  const task = await MyGlobal.prisma.erp_hrm_tasks.findUniqueOrThrow({
    where: { id: props.taskId },
    select: {
      id: true,
      erp_hrm_project_id: true,
      deleted_at: true,
    },
  });
  if (task.erp_hrm_project_id !== props.projectId) {
    throw new HttpException("Task not found in project", 404);
  }
  if (task.deleted_at !== null) {
    throw new HttpException("Task not found", 404);
  }
  // 2. Access control: member must have an active project membership
  const membership = await MyGlobal.prisma.erp_hrm_project_members.findFirst({
    where: {
      erp_hrm_project_id: props.projectId,
      deleted_at: null,
      employee: {
        erp_hrm_member_id: props.member.id,
        deleted_at: null,
      },
    },
    select: { id: true },
  });
  if (membership === null) {
    throw new HttpException("Forbidden", 403);
  }
  // 3. Build filters
  const body = props.body;
  const limit = body.limit ?? 100;
  const baseWhere = {
    erp_hrm_task_id: props.taskId,
    task: { deleted_at: null },
    ...(body.old_statuses !== undefined && body.old_statuses.length > 0
      ? { old_status: { in: body.old_statuses } }
      : {}),
    ...(body.new_statuses !== undefined && body.new_statuses.length > 0
      ? { new_status: { in: body.new_statuses } }
      : {}),
    ...(body.changed_by_member_id !== undefined
      ? { changed_by_member_id: body.changed_by_member_id }
      : {}),
  } satisfies Prisma.erp_hrm_task_historiesWhereInput;
  // 4. Cursor-based pagination takes precedence over offset
  const cursor = body.cursor;
  if (cursor !== undefined) {
    const andConditions: Prisma.erp_hrm_task_historiesWhereInput[] = [
      baseWhere,
      { created_at: { gt: cursor } },
    ];
    if (body.created_from !== undefined) {
      andConditions.push({ created_at: { gte: body.created_from } });
    }
    if (body.created_to !== undefined) {
      andConditions.push({ created_at: { lte: body.created_to } });
    }
    const cursorWhere = {
      AND: andConditions,
    } satisfies Prisma.erp_hrm_task_historiesWhereInput;
    const data = await MyGlobal.prisma.erp_hrm_task_histories.findMany({
      where: cursorWhere,
      orderBy: { created_at: "asc" },
      take: limit,
      ...ErpHrmTaskHistoryAtSummaryTransformer.select(),
    });
    const total = await MyGlobal.prisma.erp_hrm_task_histories.count({
      where: cursorWhere,
    });
    return {
      data: await ArrayUtil.asyncMap(
        data,
        ErpHrmTaskHistoryAtSummaryTransformer.transform,
      ),
      pagination: {
        current: 1,
        limit,
        records: total,
        pages: Math.ceil(total / limit),
      } satisfies IPage.IPagination,
    };
  }
  // 5. Offset-based pagination
  const page = body.page ?? 1;
  const skip = (page - 1) * limit;
  const pageWhere = {
    ...baseWhere,
    ...(body.created_from !== undefined || body.created_to !== undefined
      ? {
          created_at: {
            ...(body.created_from !== undefined
              ? { gte: body.created_from }
              : {}),
            ...(body.created_to !== undefined ? { lte: body.created_to } : {}),
          },
        }
      : {}),
  } satisfies Prisma.erp_hrm_task_historiesWhereInput;
  const data = await MyGlobal.prisma.erp_hrm_task_histories.findMany({
    where: pageWhere,
    orderBy: { created_at: "asc" },
    skip,
    take: limit,
    ...ErpHrmTaskHistoryAtSummaryTransformer.select(),
  });
  const total = await MyGlobal.prisma.erp_hrm_task_histories.count({
    where: pageWhere,
  });
  return {
    data: await ArrayUtil.asyncMap(
      data,
      ErpHrmTaskHistoryAtSummaryTransformer.transform,
    ),
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
// Complete the code below, disregard the import part and return only the function part.
// 
// ```typescript
// import { ArrayUtil } from "@nestia/e2e";
// import { HttpException } from "@nestjs/common";
// import { Prisma } from "@prisma/sdk";
// import jwt from "jsonwebtoken";
// import typia, { tags } from "typia";
// import { v4 } from "uuid";
// import { MyGlobal } from "../MyGlobal";
// import { PasswordUtil } from "../utils/PasswordUtil";
// import { toISOStringSafe } from "../utils/toISOStringSafe"
// 
// import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
// import { IErpHrmTaskHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTaskHistory";
// import { IPageIErpHrmTaskHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIErpHrmTaskHistory";
// import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
// import { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function patchErpHrmMemberProjectsProjectIdTasksTaskIdHistories(props: {
//   member: MemberPayload;
//   projectId: string & tags.Format<"uuid">;
//   taskId: string & tags.Format<"uuid">;
//   body: IErpHrmTaskHistory.IRequest;
// }): Promise<IPageIErpHrmTaskHistory.ISummary> {
//   const records = await MyGlobal.prisma.erp_hrm_task_histories.findMany({
//     ...ErpHrmTaskHistoryAtSummaryTransformer.select(),
//     ...,
//   });
//   return {
//     pagination: {
//       current: ...,
//       limit: ...,
//       records: ...,
//       pages: ...,
//     },
//     data: await ArrayUtil.asyncMap(records, ErpHrmTaskHistoryAtSummaryTransformer.transform),
//   };
// }
// ```
//--------------------------------------------------------------