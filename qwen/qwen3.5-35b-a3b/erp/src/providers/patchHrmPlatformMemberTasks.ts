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
  const member = await MyGlobal.prisma.hrm_platform_members.findFirstOrThrow({
    where: { id: props.member.id, deleted_at: null },
  });
  const projectMemberships =
    await MyGlobal.prisma.hrm_platform_project_memberships.findMany({
      where: {
        hrm_platform_employee_id: props.member.id,
        deleted_at: null,
      },
      select: { hrm_platform_project_id: true },
    });
  const projectIds = projectMemberships.map((pm) => pm.hrm_platform_project_id);
  const whereClause: Prisma.hrm_platform_tasksWhereInput = {
    deleted_at: null,
    ...(projectIds.length > 0
      ? { project_id: { in: projectIds } }
      : { project_id: { in: [] } }),
    ...(props.body.status ? { status: props.body.status } : {}),
    ...(props.body.priority ? { priority: props.body.priority } : {}),
    ...(props.body.project_id ? { project_id: props.body.project_id } : {}),
    ...(props.body.assigned_employee_id !== undefined &&
    props.body.assigned_employee_id !== null
      ? { assigned_employee_id: props.body.assigned_employee_id }
      : {}),
    ...(props.body.parent_task_id !== undefined &&
    props.body.parent_task_id !== null
      ? { parent_task_id: props.body.parent_task_id }
      : {}),
    ...(props.body.due_date_after
      ? { due_date: { gte: props.body.due_date_after } }
      : {}),
    ...(props.body.due_date_before
      ? { due_date: { lte: props.body.due_date_before } }
      : {}),
    ...(props.body.created_after
      ? { created_at: { gte: props.body.created_after } }
      : {}),
    ...(props.body.created_before
      ? { created_at: { lte: props.body.created_before } }
      : {}),
    ...(props.body.searchTitle
      ? { title: { contains: props.body.searchTitle, mode: "insensitive" } }
      : {}),
  };
  const sortOrder =
    props.body.sortOrder === "DESC" ? ("desc" as const) : ("asc" as const);
  const orderByField: Prisma.hrm_platform_tasksOrderByWithRelationInput =
    (() => {
      switch (props.body.sortBy) {
        case "created_at":
          return { created_at: sortOrder };
        case "updated_at":
          return { updated_at: sortOrder };
        case "due_date":
          return { due_date: sortOrder };
        case "priority":
          return { priority: sortOrder };
        case "title":
          return { title: sortOrder };
        default:
          return { created_at: sortOrder };
      }
    })();
  const limit = Math.min(props.body.limit ?? 100, 100) as number;
  const cursor = props.body.cursor;
  const whereWithCursor: Prisma.hrm_platform_tasksWhereInput = {
    ...whereClause,
    ...(cursor ? { id: { gt: cursor } } : {}),
  };
  const [data, total] = await Promise.all([
    MyGlobal.prisma.hrm_platform_tasks.findMany({
      where: whereWithCursor,
      orderBy: orderByField,
      take: limit + 1,
      ...HrmPlatformTaskAtSummaryTransformer.select(),
    }),
    MyGlobal.prisma.hrm_platform_tasks.count({ where: whereClause }),
  ]);
  const hasNextPage = data.length > limit;
  const nextCursor: (string & tags.Format<"uuid">) | null = hasNextPage
    ? data[limit].id
    : null;
  const items = hasNextPage ? data.slice(0, limit) : data;
  const transformedData =
    await HrmPlatformTaskAtSummaryTransformer.transformAll(items);
  const currentPage = props.body.page ?? 1;
  return {
    pagination: {
      current: currentPage,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
    data: transformedData,
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