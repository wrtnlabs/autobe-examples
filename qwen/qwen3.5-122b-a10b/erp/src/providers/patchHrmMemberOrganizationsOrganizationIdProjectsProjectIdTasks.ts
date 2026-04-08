import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmDepartment";
import { IHrmEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmEmployee";
import { IHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmMember";
import { IHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmOrganization";
import { IHrmProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmProject";
import { IHrmRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmRole";
import { IHrmTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTask";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIHrmTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmTask";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { HrmTaskAtSummaryTransformer } from "../transformers/HrmTaskAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchHrmMemberOrganizationsOrganizationIdProjectsProjectIdTasks(props: {
  member: MemberPayload;
  organizationId: string & tags.Format<"uuid">;
  projectId: string & tags.Format<"uuid">;
  body: IHrmTask.IRequest;
}): Promise<IPageIHrmTask.ISummary> {
  // Verify project exists and belongs to organization
  await MyGlobal.prisma.hrm_projects.findUniqueOrThrow({
    where: {
      id: props.projectId,
      organization: {
        id: props.organizationId,
      },
    },
  });
  // Find employee record for this member in the organization
  const employee = await MyGlobal.prisma.hrm_employees.findFirst({
    where: {
      user_id: props.member.id,
      organization_id: props.organizationId,
      deleted_at: null,
    },
  });
  if (!employee) {
    throw new HttpException("Forbidden", 403);
  }
  // Verify project membership
  const membership = await MyGlobal.prisma.hrm_project_members.findFirst({
    where: {
      project_id: props.projectId,
      employee_id: employee.id,
    },
  });
  if (!membership) {
    throw new HttpException("Forbidden", 403);
  }
  // Build where clause
  const where: Prisma.hrm_tasksWhereInput = {
    project_id: props.projectId,
    deleted_at: null,
  };
  // Apply status filter
  if (props.body.status) {
    where.status = props.body.status;
  }
  // Apply priority filter
  if (props.body.priority) {
    where.priority = props.body.priority;
  }
  // Apply assigned employee filter
  if (props.body.assigned_employee_id !== undefined) {
    if (props.body.assigned_employee_id === null) {
      where.assigned_employee_id = null;
    } else {
      where.assigned_employee_id = props.body.assigned_employee_id;
    }
  }
  // Apply due date range filter
  if (props.body.due_date_from || props.body.due_date_to) {
    where.due_date = {};
    if (props.body.due_date_from) {
      where.due_date.gte = new Date(props.body.due_date_from);
    }
    if (props.body.due_date_to) {
      where.due_date.lte = new Date(props.body.due_date_to);
    }
  }
  // Apply created date range filter
  if (props.body.created_from || props.body.created_to) {
    where.created_at = {};
    if (props.body.created_from) {
      where.created_at.gte = new Date(props.body.created_from);
    }
    if (props.body.created_to) {
      where.created_at.lte = new Date(props.body.created_to);
    }
  }
  // Apply text search filter
  if (props.body.search) {
    where.OR = [
      { title: { contains: props.body.search, mode: "insensitive" } },
      { description: { contains: props.body.search, mode: "insensitive" } },
    ];
  }
  // Calculate pagination
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  // Get total count
  const total = await MyGlobal.prisma.hrm_tasks.count({ where });
  // Fetch paginated records
  const records = await MyGlobal.prisma.hrm_tasks.findMany({
    where,
    skip,
    take: limit,
    orderBy: { created_at: "desc" },
    ...HrmTaskAtSummaryTransformer.select(),
  });
  // Transform and return
  return {
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
    data: await HrmTaskAtSummaryTransformer.transformAll(records),
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
// import { IHrmTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTask";
// import { IPageIHrmTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmTask";
// import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
// import { IHrmProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmProject";
// import { IHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmOrganization";
// import { IHrmEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmEmployee";
// import { IHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmMember";
// import { IHrmRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmRole";
// import { IHrmDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmDepartment";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function patchHrmMemberOrganizationsOrganizationIdProjectsProjectIdTasks(props: {
//   member: MemberPayload;
//   organizationId: string & tags.Format<"uuid">;
//   projectId: string & tags.Format<"uuid">;
//   body: IHrmTask.IRequest;
// }): Promise<IPageIHrmTask.ISummary> {
//   const records = await MyGlobal.prisma.hrm_tasks.findMany({
//     ...HrmTaskAtSummaryTransformer.select(),
//     ...,
//   });
//   return {
//     pagination: {
//       current: ...,
//       limit: ...,
//       records: ...,
//       pages: ...,
//     },
//     data: await HrmTaskAtSummaryTransformer.transformAll(records),
//   };
// }
// ```
//--------------------------------------------------------------