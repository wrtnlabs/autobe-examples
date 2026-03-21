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
  // Verify task exists and belongs to the specified project
  const task = await MyGlobal.prisma.erp_hrm_tasks.findUnique({
    where: { id: props.taskId },
    select: {
      id: true,
      project_id: true,
      project: {
        select: {
          id: true,
          organization_id: true,
        },
      },
      employee_id: true,
    },
  });
  if (task === null || task.project_id !== props.projectId) {
    throw new HttpException("Task not found", 404);
  }
  // Authorization: Check if member has access
  // 1. Get member's employee record in this organization
  const employee = await MyGlobal.prisma.erp_hrm_employees.findFirst({
    where: {
      erp_hrm_member_id: props.member.id,
      erp_hrm_organization_id: task.project.organization_id,
      deleted_at: null,
    },
    select: { id: true },
  });
  let isAuthorized = false;
  if (employee !== null) {
    // Check if employee is a project member
    const projectMember =
      await MyGlobal.prisma.erp_hrm_project_members.findFirst({
        where: {
          erp_hrm_employee_id: employee.id,
          erp_hrm_project_id: props.projectId,
          deleted_at: null,
        },
        select: { id: true },
      });
    if (projectMember !== null) {
      isAuthorized = true;
    }
    // Check if assigned to the task
    if (!isAuthorized && task.employee_id === employee.id) {
      isAuthorized = true;
    }
  }
  if (!isAuthorized) {
    throw new HttpException("Forbidden", 403);
  }
  // Build WHERE clause with filters
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  const createdAtFilter =
    props.body.created_at_from !== undefined &&
    props.body.created_at_to !== undefined
      ? {
          gte: new Date(props.body.created_at_from),
          lte: new Date(props.body.created_at_to),
        }
      : props.body.created_at_from !== undefined
        ? { gte: new Date(props.body.created_at_from) }
        : props.body.created_at_to !== undefined
          ? { lte: new Date(props.body.created_at_to) }
          : undefined;
  const whereClause = {
    task_id: props.taskId,
    ...(props.body.previous_status !== undefined && {
      previous_status: props.body.previous_status,
    }),
    ...(props.body.new_status !== undefined && {
      new_status: props.body.new_status,
    }),
    ...(createdAtFilter !== undefined && { created_at: createdAtFilter }),
  } satisfies Prisma.erp_hrm_task_historiesWhereInput;
  // Query task histories
  const histories = await MyGlobal.prisma.erp_hrm_task_histories.findMany({
    where: whereClause,
    ...ErpHrmTaskHistoryAtSummaryTransformer.select(),
    orderBy: { created_at: "desc" },
    skip,
    take: limit,
  });
  // Get total count
  const total = await MyGlobal.prisma.erp_hrm_task_histories.count({
    where: whereClause,
  });
  // Transform results
  const data = await ArrayUtil.asyncMap(
    histories,
    ErpHrmTaskHistoryAtSummaryTransformer.transform,
  );
  return {
    data,
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  } satisfies IPageIErpHrmTaskHistory.ISummary;
}
