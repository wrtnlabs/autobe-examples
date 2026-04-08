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
import { HrmPlatformTaskAtSummaryTransformer } from "../transformers/HrmPlatformTaskAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchHrmPlatformMemberTasks(props: {
  member: MemberPayload;
  body: IHrmPlatformTask.IRequest;
}): Promise<IPageIHrmPlatformTask.ISummary> {
  // Resolve session for organization context
  const session =
    await MyGlobal.prisma.hrm_platform_member_sessions.findFirstOrThrow({
      where: {
        id: props.member.session_id,
        hrm_platform_member_id: props.member.id,
        expired_at: { gt: new Date() },
        member: {
          id: props.member.id,
          is_active: true,
          deleted_at: null,
        },
      },
      select: { organization_id: true },
    });
  // Calculate pagination parameters
  const page = props.body.page ?? 1;
  const limit = Math.min(props.body.limit ?? 100, 100);
  const cursor = props.body.cursor ?? null;
  const skip = (page - 1) * limit;
  // Build base where clause with org isolation
  const where: Prisma.hrm_platform_tasksWhereInput = {
    deleted_at: null,
    project: {
      organization_id: session.organization_id!,
    },
  };
  // Apply filters
  if (props.body.status != null) {
    where.status = props.body.status;
  }
  if (props.body.priority != null) {
    where.priority = props.body.priority;
  }
  if (props.body.project_id != null) {
    where.project_id = props.body.project_id;
  }
  if (props.body.assigned_employee_id != null) {
    where.assigned_employee_id = props.body.assigned_employee_id;
  }
  if (props.body.parent_task_id != null) {
    where.parent_task_id = props.body.parent_task_id;
  }
  // Apply due date filters
  if (props.body.due_date_after != null) {
    where.due_date = {
      gte: new Date(props.body.due_date_after),
    };
  }
  if (props.body.due_date_before != null) {
    where.due_date = {
      lte: new Date(props.body.due_date_before),
    };
  }
  // Apply created date filters
  if (props.body.created_after != null) {
    where.created_at = {
      gte: new Date(props.body.created_after),
    };
  }
  if (props.body.created_before != null) {
    where.created_at = {
      lte: new Date(props.body.created_before),
    };
  }
  // Apply title search
  if (props.body.searchTitle != null) {
    where.title = {
      contains: props.body.searchTitle,
      mode: "insensitive",
    };
  }
  // Apply cursor pagination
  if (cursor != null) {
    where.id = { gt: cursor };
  }
  // Configure sorting
  const sortBy = props.body.sortBy ?? "created_at";
  const validSortFields = [
    "created_at",
    "updated_at",
    "due_date",
    "priority",
    "title",
  ];
  const sortedBy = validSortFields.includes(sortBy) ? sortBy : "created_at";
  const sortOrder = props.body.sortOrder === "DESC" ? "desc" : "asc";
  const orderBy: Prisma.hrm_platform_tasksOrderByWithRelationInput = {
    [sortedBy]: sortOrder,
  };
  // Execute query with limit + 1 to check for next page
  const records = await MyGlobal.prisma.hrm_platform_tasks.findMany({
    where,
    orderBy,
    skip,
    take: limit + 1,
    ...HrmPlatformTaskAtSummaryTransformer.select(),
  });
  // Determine if there's a next page
  const hasNextPage = records.length > limit;
  const data = hasNextPage ? records.slice(0, limit) : records;
  // Get total count for pagination metadata
  const totalCount = await MyGlobal.prisma.hrm_platform_tasks.count({ where });
  // Transform records to DTO
  const transformedData =
    await HrmPlatformTaskAtSummaryTransformer.transformAll(data);
  // Calculate pagination metadata
  const totalPages = Math.max(Math.ceil(totalCount / limit), 0);
  return {
    pagination: {
      current: page,
      limit,
      records: totalCount,
      pages: totalPages,
    },
    data: transformedData,
  } satisfies IPageIHrmPlatformTask.ISummary;
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
// import { IHrmPlatformTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformTask";
// import { IPageIHrmPlatformTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmPlatformTask";
// import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
// import { IHrmPlatformProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformProject";
// import { IHrmPlatformEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformEmployee";
// import { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
// import { IHrmPlatformRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformRole";
// import { IHrmPlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganization";
// import { IHrmPlatformDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformDepartment";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function patchHrmPlatformMemberTasks(props: {
//   member: MemberPayload;
//   body: IHrmPlatformTask.IRequest;
// }): Promise<IPageIHrmPlatformTask.ISummary> {
//   const records = await MyGlobal.prisma.hrm_platform_tasks.findMany({
//     ...HrmPlatformTaskAtSummaryTransformer.select(),
//     ...,
//   });
//   return {
//     pagination: {
//       current: ...,
//       limit: ...,
//       records: ...,
//       pages: ...,
//     },
//     data: await HrmPlatformTaskAtSummaryTransformer.transformAll(records),
//   };
// }
// ```
//--------------------------------------------------------------