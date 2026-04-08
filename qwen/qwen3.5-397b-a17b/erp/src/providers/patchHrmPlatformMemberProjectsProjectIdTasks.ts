import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmPlatformDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformDepartment";
import { IHrmPlatformEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformEmployee";
import { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
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
import { HrmPlatformTaskAtSummaryTransformer } from "../transformers/HrmPlatformTaskAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchHrmPlatformMemberProjectsProjectIdTasks(props: {
  member: MemberPayload;
  projectId: string & tags.Format<"uuid">;
  body: IHrmPlatformTask.IRequest;
}): Promise<IPageIHrmPlatformTask.ISummary> {
  const employee = await MyGlobal.prisma.hrm_platform_employees.findFirst({
    where: {
      member_id: props.member.id,
      deleted_at: null,
    },
  });
  if (!employee) {
    throw new HttpException("Forbidden", 403);
  }
  const projectMember =
    await MyGlobal.prisma.hrm_platform_project_members.findFirst({
      where: {
        hrm_platform_project_id: props.projectId,
        hrm_platform_employee_id: employee.id,
      },
    });
  if (!projectMember) {
    throw new HttpException("Forbidden", 403);
  }
  const page = props.body.page ?? 1;
  const limit = Math.min(props.body.limit ?? 20, 100);
  const skip = (page - 1) * limit;
  const whereInput = {
    hrm_platform_project_id: props.projectId,
    deleted_at: null,
    ...(props.body.status && { status: props.body.status }),
    ...(props.body.priority && { priority: props.body.priority }),
    ...(props.body.assignedEmployeeId !== undefined && {
      assigned_employee_id: props.body.assignedEmployeeId,
    }),
    ...(props.body.search && {
      OR: [
        { title: { contains: props.body.search } },
        { description: { contains: props.body.search } },
      ],
    }),
  } satisfies Prisma.hrm_platform_tasksWhereInput;
  const sortField = props.body.sort ?? "createdAt";
  const sortDirection = props.body.sortDirection ?? "asc";
  const orderByInput = (() => {
    if (sortField === "dueDate") {
      return { due_date: { sort: sortDirection, nulls: "last" } };
    } else if (sortField === "priority") {
      return { priority: sortDirection };
    }
    return { created_at: sortDirection };
  })() satisfies Prisma.hrm_platform_tasksOrderByWithRelationInput;
  const data = await MyGlobal.prisma.hrm_platform_tasks.findMany({
    where: whereInput,
    skip,
    take: limit,
    orderBy: orderByInput,
    ...HrmPlatformTaskAtSummaryTransformer.select(),
  });
  const total = await MyGlobal.prisma.hrm_platform_tasks.count({
    where: whereInput,
  });
  const totalPages = Math.ceil(total / limit);
  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: totalPages,
    } satisfies IPage.IPagination,
    data: await HrmPlatformTaskAtSummaryTransformer.transformAll(data),
  } satisfies IPageIHrmPlatformTask.ISummary;
}
