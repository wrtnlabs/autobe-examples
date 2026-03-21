import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IErpHrmDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmDepartment";
import { IErpHrmEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmEmployee";
import { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
import { IErpHrmRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmRole";
import { IErpHrmTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTask";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIErpHrmTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIErpHrmTask";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { ErpHrmTaskAtSummaryTransformer } from "../transformers/ErpHrmTaskAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchErpHrmMemberProjectsProjectIdTasks(props: {
  member: MemberPayload;
  projectId: string & tags.Format<"uuid">;
  body: IErpHrmTask.IRequest;
}): Promise<IPageIErpHrmTask.ISummary> {
  // Verify project exists
  const project = await MyGlobal.prisma.erp_hrm_projects.findUniqueOrThrow({
    where: { id: props.projectId },
    select: { id: true, organization_id: true },
  });
  // Find employee in the project's organization
  const employee = await MyGlobal.prisma.erp_hrm_employees.findFirst({
    where: {
      erp_hrm_member_id: props.member.id,
      erp_hrm_organization_id: project.organization_id,
      deleted_at: null,
    },
    select: { id: true, erp_hrm_role_id: true },
  });
  if (!employee) {
    throw new HttpException("Employee not found in organization", 403);
  }
  // Check authorization: project member OR project:manage permission
  const projectMembership =
    await MyGlobal.prisma.erp_hrm_project_members.findFirst({
      where: {
        erp_hrm_employee_id: employee.id,
        erp_hrm_project_id: props.projectId,
        deleted_at: null,
      },
    });
  if (!projectMembership) {
    const permission = await MyGlobal.prisma.erp_hrm_role_permissions.findFirst(
      {
        where: {
          erp_hrm_role_id: employee.erp_hrm_role_id,
          permission: "project:manage",
        },
      },
    );
    if (!permission) {
      throw new HttpException("Access denied to project tasks", 403);
    }
  }
  // Build where clause
  const where = {
    project_id: props.projectId,
    deleted_at: null,
    ...(props.body.status !== undefined && { status: props.body.status }),
    ...(props.body.priority !== undefined && { priority: props.body.priority }),
    ...(props.body.employeeId !== undefined && {
      employee_id: props.body.employeeId,
    }),
    ...(props.body.search !== undefined && {
      title: { contains: props.body.search, mode: "insensitive" as const },
    }),
  } satisfies Prisma.erp_hrm_tasksWhereInput;
  // Pagination defaults
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  // Query tasks using transformer select
  const tasks = await MyGlobal.prisma.erp_hrm_tasks.findMany({
    where,
    skip,
    take: limit,
    orderBy: { created_at: "desc" as const },
    ...ErpHrmTaskAtSummaryTransformer.select(),
  });
  // Count total
  const total = await MyGlobal.prisma.erp_hrm_tasks.count({ where });
  // Transform and return
  const data = await ArrayUtil.asyncMap(
    tasks,
    ErpHrmTaskAtSummaryTransformer.transform,
  );
  return {
    data,
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  } satisfies IPageIErpHrmTask.ISummary;
}
