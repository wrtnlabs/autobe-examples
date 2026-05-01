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
  const project = await MyGlobal.prisma.erp_hrm_projects.findUniqueOrThrow({
    where: { id: props.projectId, deleted_at: null },
    select: { id: true, organization_id: true },
  });
  const employee = await MyGlobal.prisma.erp_hrm_employees.findFirst({
    where: {
      erp_hrm_member_id: props.member.id,
      erp_hrm_organization_id: project.organization_id,
      deleted_at: null,
    },
    select: {
      id: true,
      erp_hrm_role_id: true,
    },
  });
  if (employee === null) {
    throw new HttpException("Forbidden", 403);
  }
  const membership = await MyGlobal.prisma.erp_hrm_project_members.findFirst({
    where: {
      erp_hrm_employee_id: employee.id,
      erp_hrm_project_id: props.projectId,
      deleted_at: null,
    },
    select: { id: true },
  });
  if (membership === null) {
    const hasPermission =
      await MyGlobal.prisma.erp_hrm_role_permissions.findFirst({
        where: {
          erp_hrm_role_id: employee.erp_hrm_role_id,
          permission: {
            key: { in: ["project:view", "project:manage"] },
          },
        },
        select: { id: true },
      });
    if (hasPermission === null) {
      throw new HttpException("Forbidden", 403);
    }
  }
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  const whereClause = {
    erp_hrm_project_id: props.projectId,
    deleted_at: null,
    ...(props.body.status !== undefined &&
      props.body.status.length > 0 && {
        status: { in: props.body.status },
      }),
    ...(props.body.priority !== undefined &&
      props.body.priority.length > 0 && {
        priority: { in: props.body.priority },
      }),
    ...(props.body.assignedEmployeeId !== undefined && {
      erp_hrm_assigned_employee_id: props.body.assignedEmployeeId,
    }),
    ...(props.body.parentTaskId !== undefined && {
      erp_hrm_parent_task_id: props.body.parentTaskId,
    }),
    ...((props.body.dueDateFrom !== undefined ||
      props.body.dueDateTo !== undefined) && {
      due_date: {
        ...(props.body.dueDateFrom !== undefined && {
          gte: props.body.dueDateFrom,
        }),
        ...(props.body.dueDateTo !== undefined && {
          lte: props.body.dueDateTo,
        }),
      },
    }),
    ...(props.body.search !== undefined && {
      title: { contains: props.body.search, mode: "insensitive" },
    }),
  } satisfies Prisma.erp_hrm_tasksWhereInput;
  const orderBy = {
    ...(props.body.sort === "due_date"
      ? { due_date: props.body.order ?? "desc" }
      : props.body.sort === "priority"
        ? { priority: props.body.order ?? "desc" }
        : { created_at: props.body.order ?? "desc" }),
  } satisfies Prisma.erp_hrm_tasksOrderByWithRelationInput;
  const data = await MyGlobal.prisma.erp_hrm_tasks.findMany({
    where: whereClause,
    skip,
    take: limit,
    orderBy,
    ...ErpHrmTaskAtSummaryTransformer.select(),
  });
  const total = await MyGlobal.prisma.erp_hrm_tasks.count({
    where: whereClause,
  });
  return {
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
    data: await ErpHrmTaskAtSummaryTransformer.transformAll(data),
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
// import { IErpHrmTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTask";
// import { IPageIErpHrmTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIErpHrmTask";
// import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
// import { IErpHrmEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmEmployee";
// import { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
// import { IErpHrmRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmRole";
// import { IErpHrmDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmDepartment";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function patchErpHrmMemberProjectsProjectIdTasks(props: {
//   member: MemberPayload;
//   projectId: string & tags.Format<"uuid">;
//   body: IErpHrmTask.IRequest;
// }): Promise<IPageIErpHrmTask.ISummary> {
//   const records = await MyGlobal.prisma.erp_hrm_tasks.findMany({
//     ...ErpHrmTaskAtSummaryTransformer.select(),
//     ...,
//   });
//   return {
//     pagination: {
//       current: ...,
//       limit: ...,
//       records: ...,
//       pages: ...,
//     },
//     data: await ErpHrmTaskAtSummaryTransformer.transformAll(records),
//   };
// }
// ```
//--------------------------------------------------------------