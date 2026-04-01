import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IErpHrmTimeTrackingMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeTrackingMember";
import { IErpHrmTimeTrackingProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeTrackingProject";
import { IErpHrmTimeTrackingTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeTrackingTask";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIErpHrmTimeTrackingTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIErpHrmTimeTrackingTask";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { ErpHrmTimeTrackingTaskAtSummaryTransformer } from "../transformers/ErpHrmTimeTrackingTaskAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchErpHrmTimeTrackingMemberProjectsProjectIdTasks(props: {
  member: MemberPayload;
  projectId: string & tags.Format<"uuid">;
  body: IErpHrmTimeTrackingTask.IRequest;
}): Promise<IPageIErpHrmTimeTrackingTask.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  const membership =
    await MyGlobal.prisma.erp_hrm_time_tracking_project_memberships.findFirst({
      where: {
        project_id: props.projectId,
        employee_id: props.member.id,
        deleted_at: null,
      },
      select: { id: true },
    });
  if (membership === null) {
    return {
      pagination: {
        current: page,
        limit,
        records: 0,
        pages: 0,
      } satisfies IPage.IPagination,
      data: [],
    };
  }
  const title = props.body.title;
  const description = props.body.description;
  const status = props.body.status;
  const priority = props.body.priority;
  const assignedEmployeeId = props.body.assignedEmployeeId;
  const parentTaskId = props.body.parentTaskId;
  const dueDateFrom = props.body.dueDateFrom;
  const dueDateTo = props.body.dueDateTo;
  const estimatedHoursFrom = props.body.estimatedHoursFrom;
  const estimatedHoursTo = props.body.estimatedHoursTo;
  const whereInput = {
    erp_hrm_time_tracking_project_id: props.projectId,
    deleted_at: null,
    ...(title !== undefined
      ? {
          title: { contains: title, mode: "insensitive" },
        }
      : {}),
    ...(description !== undefined
      ? {
          description: description,
        }
      : {}),
    ...(status !== undefined
      ? {
          status: status,
        }
      : {}),
    ...(priority !== undefined
      ? {
          priority: priority,
        }
      : {}),
    ...(assignedEmployeeId !== undefined
      ? {
          assigned_employee_id: assignedEmployeeId,
        }
      : {}),
    ...(parentTaskId !== undefined
      ? {
          parent_task_id: parentTaskId,
        }
      : {}),
    ...(dueDateFrom !== undefined || dueDateTo !== undefined
      ? {
          due_date: {
            ...(dueDateFrom === null || dueDateFrom === undefined
              ? {}
              : { gte: dueDateFrom }),
            ...(dueDateTo === null || dueDateTo === undefined
              ? {}
              : { lte: dueDateTo }),
          },
        }
      : {}),
    ...(estimatedHoursFrom !== undefined || estimatedHoursTo !== undefined
      ? {
          estimated_hours: {
            ...(estimatedHoursFrom === null || estimatedHoursFrom === undefined
              ? {}
              : { gte: estimatedHoursFrom }),
            ...(estimatedHoursTo === null || estimatedHoursTo === undefined
              ? {}
              : { lte: estimatedHoursTo }),
          },
        }
      : {}),
  } satisfies Prisma.erp_hrm_time_tracking_tasksWhereInput;
  const orderByInput = (() => {
    const sortBy = props.body.sortBy;
    const sortOrder = props.body.sortOrder ?? "desc";
    if (sortBy === "due_date")
      return {
        due_date: sortOrder,
      } satisfies Prisma.erp_hrm_time_tracking_tasksOrderByWithRelationInput;
    if (sortBy === "priority")
      return {
        priority: sortOrder,
      } satisfies Prisma.erp_hrm_time_tracking_tasksOrderByWithRelationInput;
    if (sortBy === "created_at")
      return {
        created_at: sortOrder,
      } satisfies Prisma.erp_hrm_time_tracking_tasksOrderByWithRelationInput;
    if (sortBy === "title")
      return {
        title: sortOrder,
      } satisfies Prisma.erp_hrm_time_tracking_tasksOrderByWithRelationInput;
    return {
      created_at: "desc",
    } satisfies Prisma.erp_hrm_time_tracking_tasksOrderByWithRelationInput;
  })();
  const records = await MyGlobal.prisma.erp_hrm_time_tracking_tasks.count({
    where: whereInput,
  });
  const rows = await MyGlobal.prisma.erp_hrm_time_tracking_tasks.findMany({
    where: whereInput,
    skip,
    take: limit,
    orderBy: orderByInput,
    ...ErpHrmTimeTrackingTaskAtSummaryTransformer.select(),
  });
  const pages = records === 0 ? 0 : Math.ceil(records / limit);
  return {
    pagination: {
      current: page,
      limit,
      records,
      pages,
    } satisfies IPage.IPagination,
    data: await ErpHrmTimeTrackingTaskAtSummaryTransformer.transformAll(rows),
  };
}
