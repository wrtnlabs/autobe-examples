import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmPlatformDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformDepartment";
import { IHrmPlatformEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformEmployee";
import { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import { IHrmPlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganization";
import { IHrmPlatformProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformProject";
import { IHrmPlatformRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformRole";
import { IHrmPlatformTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformTask";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIHrmPlatformTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmPlatformTask";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { HrmPlatformEmployeeAtSummaryTransformer } from "../transformers/HrmPlatformEmployeeAtSummaryTransformer";
import { HrmPlatformProjectAtSummaryTransformer } from "../transformers/HrmPlatformProjectAtSummaryTransformer";
import { HrmPlatformTaskAtSummaryTransformer } from "../transformers/HrmPlatformTaskAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchHrmPlatformMemberProjectsProjectIdTasks(props: {
  member: MemberPayload;
  projectId: string & tags.Format<"uuid">;
  body: IHrmPlatformTask.IRequest;
}): Promise<IPageIHrmPlatformTask.ISummary> {
  // Find employee record for this member
  const employee = await MyGlobal.prisma.hrm_platform_employees.findFirst({
    where: {
      hrm_platform_user_id: props.member.id,
      deleted_at: null,
    },
  });
  if (!employee) {
    throw new HttpException("You're not enrolled as an employee", 403);
  }
  // Verify project membership
  const projectMember =
    await MyGlobal.prisma.hrm_platform_project_members.findFirst({
      where: {
        hrm_platform_employee_id: employee.id,
        hrm_platform_project_id: props.projectId,
        deleted_at: null,
      },
    });
  if (!projectMember) {
    throw new HttpException("Forbidden", 403);
  }
  // Build where clause
  const whereInput: Prisma.hrm_platform_tasksWhereInput = {
    hrm_platform_projects_id: props.projectId,
    deleted_at: null,
    ...(props.body.status && { status: props.body.status }),
    ...(props.body.priority && { priority: props.body.priority }),
    ...(props.body.hrm_platform_employees_id && {
      hrm_platform_employees_id: props.body.hrm_platform_employees_id,
    }),
    ...(props.body.search && {
      OR: [
        { title: { contains: props.body.search, mode: "insensitive" } },
        { description: { contains: props.body.search, mode: "insensitive" } },
      ],
    }),
  } satisfies Prisma.hrm_platform_tasksWhereInput;
  // Build orderBy clause
  const sortBy = props.body.sort_by ?? "created_at";
  const sortDirection = props.body.sort_direction ?? "desc";
  const orderByInput: Prisma.hrm_platform_tasksOrderByWithRelationInput =
    sortBy === "due_date"
      ? { due_date: sortDirection }
      : sortBy === "priority"
        ? { priority: sortDirection }
        : { created_at: sortDirection };
  // Pagination
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  // Query tasks with relations
  const tasks = await MyGlobal.prisma.hrm_platform_tasks.findMany({
    where: whereInput,
    orderBy: orderByInput,
    skip,
    take: limit,
    select: {
      id: true,
      title: true,
      description: true,
      status: true,
      priority: true,
      estimated_hours: true,
      due_date: true,
      created_at: true,
      updated_at: true,
      deleted_at: true,
      hrm_platform_projects_id: true,
      hrm_platform_employees_id: true,
      hrm_platform_tasks_id: true,
      project: HrmPlatformProjectAtSummaryTransformer.select(),
      assignedEmployee: HrmPlatformEmployeeAtSummaryTransformer.select(),
      parent: {
        select: {
          id: true,
          title: true,
          status: true,
          priority: true,
          estimated_hours: true,
          due_date: true,
          created_at: true,
          updated_at: true,
          deleted_at: true,
          hrm_platform_projects_id: true,
          hrm_platform_employees_id: true,
          hrm_platform_tasks_id: true,
        },
      } satisfies Prisma.hrm_platform_tasksFindManyArgs,
    },
  });
  // Query total count
  const total = await MyGlobal.prisma.hrm_platform_tasks.count({
    where: whereInput,
  });
  // Transform tasks
  const transformedTasks = await ArrayUtil.asyncMap(tasks, async (task) => {
    const base = await HrmPlatformTaskAtSummaryTransformer.transform({
      id: task.id,
      title: task.title,
      description: task.description,
      status: task.status,
      priority: task.priority,
      estimated_hours: task.estimated_hours,
      due_date: task.due_date,
      created_at: task.created_at,
      updated_at: task.updated_at,
      deleted_at: task.deleted_at,
      hrm_platform_projects_id: task.hrm_platform_projects_id,
      hrm_platform_employees_id: task.hrm_platform_employees_id,
      hrm_platform_tasks_id: task.hrm_platform_tasks_id,
    });
    return {
      ...base,
      project: task.project
        ? await HrmPlatformProjectAtSummaryTransformer.transform(task.project)
        : ({} as IHrmPlatformProject.ISummary),
      assignedEmployee: task.assignedEmployee
        ? await HrmPlatformEmployeeAtSummaryTransformer.transform(
            task.assignedEmployee,
          )
        : null,
      parent: task.parent
        ? ({
            id: task.parent.id,
            title: task.parent.title,
            status: task.parent.status,
            priority: task.parent.priority,
            estimated_hours: task.parent.estimated_hours,
            due_date: task.parent.due_date
              ? toISOStringSafe(task.parent.due_date)
              : null,
            created_at: toISOStringSafe(task.parent.created_at),
            updated_at: toISOStringSafe(task.parent.updated_at),
            deleted_at: task.parent.deleted_at
              ? toISOStringSafe(task.parent.deleted_at)
              : null,
            project: {} as IHrmPlatformProject.ISummary,
            assignedEmployee: null,
          } satisfies IHrmPlatformTask.ISummary["parent"])
        : null,
    } satisfies IHrmPlatformTask.ISummary;
  });
  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
    data: transformedTasks,
  } satisfies IPageIHrmPlatformTask.ISummary;
}
