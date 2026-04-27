import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmTimeTrackingDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingDepartment";
import { IHrmTimeTrackingEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingEmployee";
import { IHrmTimeTrackingMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingMember";
import { IHrmTimeTrackingOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingOrganization";
import { IHrmTimeTrackingProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingProject";
import { IHrmTimeTrackingRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingRole";
import { IHrmTimeTrackingTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingTask";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIHrmTimeTrackingTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmTimeTrackingTask";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { HrmTimeTrackingTaskAtSummaryTransformer } from "../transformers/HrmTimeTrackingTaskAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

// DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
export async function patchHrmTimeTrackingMemberProjectsProjectIdTasks(props: {
  member: MemberPayload;
  projectId: string & tags.Format<"uuid">;
  body: IHrmTimeTrackingTask.IRequest;
}): Promise<IPageIHrmTimeTrackingTask.ISummary> {
  // 1. Verify project exists and is not soft-deleted
  const project =
    await MyGlobal.prisma.hrm_time_tracking_projects.findUniqueOrThrow({
      where: { id: props.projectId },
      select: {
        id: true,
        hrm_time_tracking_organization_id: true,
      },
    });
  // 2. Find the employee record for this member in the project's organization
  const employee = await MyGlobal.prisma.hrm_time_tracking_employees.findFirst({
    where: {
      hrm_time_tracking_member_id: props.member.id,
      hrm_time_tracking_organization_id:
        project.hrm_time_tracking_organization_id,
      deleted_at: null,
    },
    select: { id: true },
  });
  if (employee === null) {
    throw new HttpException("Forbidden", 403);
  }
  // 3. Verify the employee is a member of the project
  const membership =
    await MyGlobal.prisma.hrm_time_tracking_project_members.findFirst({
      where: {
        hrm_time_tracking_project_id: props.projectId,
        hrm_time_tracking_employee_id: employee.id,
        deleted_at: null,
      },
      select: { id: true },
    });
  if (membership === null) {
    throw new HttpException("Forbidden", 403);
  }
  // 4. Build dynamic WHERE clause from request filters
  const searchFilter:
    | {}
    | {
        OR: Prisma.hrm_time_tracking_tasksWhereInput[];
      } =
    props.body.search !== undefined && props.body.search.length > 0
      ? {
          OR: [
            { title: { contains: props.body.search } },
            { description: { contains: props.body.search } },
          ] satisfies Prisma.hrm_time_tracking_tasksWhereInput[],
        }
      : {};
  const where: Prisma.hrm_time_tracking_tasksWhereInput = {
    hrm_time_tracking_project_id: props.projectId,
    deleted_at: null,
    ...(props.body.status !== undefined && { status: props.body.status }),
    ...(props.body.priority !== undefined && { priority: props.body.priority }),
    ...(props.body.employeeId !== undefined && {
      hrm_time_tracking_employee_id: props.body.employeeId,
    }),
    ...searchFilter,
  };
  // 5. Pagination parameters
  const page: number = props.body.page ?? 1;
  const limit: number = props.body.limit ?? 20;
  const skip: number = (page - 1) * limit;
  // 6. Sort configuration
  const sortBy: string = props.body.sortBy ?? "created_at";
  const direction: "asc" | "desc" =
    props.body.direction === "asc" ? "asc" : "desc";
  // 7. Count total matching records
  const total: number = await MyGlobal.prisma.hrm_time_tracking_tasks.count({
    where,
  });
  // 8. Fetch records with appropriate sorting
  const priorityOrder: Record<string, number> = {
    urgent: 4,
    high: 3,
    medium: 2,
    low: 1,
  };
  let records: HrmTimeTrackingTaskAtSummaryTransformer.Payload[];
  if (sortBy === "priority") {
    // Priority sort: fetch all matching records, sort in-memory with numeric mapping
    const allRecords = await MyGlobal.prisma.hrm_time_tracking_tasks.findMany({
      where,
      ...HrmTimeTrackingTaskAtSummaryTransformer.select(),
      orderBy: {
        created_at: "desc",
      } satisfies Prisma.hrm_time_tracking_tasksOrderByWithRelationInput,
    });
    allRecords.sort((a, b) => {
      const aOrder: number = priorityOrder[a.priority] ?? 0;
      const bOrder: number = priorityOrder[b.priority] ?? 0;
      const diff: number = aOrder - bOrder;
      return direction === "asc" ? diff : -diff;
    });
    records = allRecords.slice(skip, skip + limit);
  } else if (sortBy === "due_date") {
    const orderBy: Prisma.hrm_time_tracking_tasksOrderByWithRelationInput = {
      due_date: direction,
    };
    records = await MyGlobal.prisma.hrm_time_tracking_tasks.findMany({
      where,
      ...HrmTimeTrackingTaskAtSummaryTransformer.select(),
      skip,
      take: limit,
      orderBy,
    });
  } else {
    // Default: sort by created_at
    const orderBy: Prisma.hrm_time_tracking_tasksOrderByWithRelationInput = {
      created_at: direction,
    };
    records = await MyGlobal.prisma.hrm_time_tracking_tasks.findMany({
      where,
      ...HrmTimeTrackingTaskAtSummaryTransformer.select(),
      skip,
      take: limit,
      orderBy,
    });
  }
  // 9. Transform records and return paginated response
  const pages: number = total === 0 ? 0 : Math.ceil(total / limit);
  return {
    pagination: {
      current: page,
      limit,
      records: total,
      pages,
    } satisfies IPage.IPagination,
    data: await HrmTimeTrackingTaskAtSummaryTransformer.transformAll(records),
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
// import { IHrmTimeTrackingTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingTask";
// import { IPageIHrmTimeTrackingTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmTimeTrackingTask";
// import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
// import { IHrmTimeTrackingProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingProject";
// import { IHrmTimeTrackingOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingOrganization";
// import { IHrmTimeTrackingMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingMember";
// import { IHrmTimeTrackingEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingEmployee";
// import { IHrmTimeTrackingRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingRole";
// import { IHrmTimeTrackingDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingDepartment";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function patchHrmTimeTrackingMemberProjectsProjectIdTasks(props: {
//   member: MemberPayload;
//   projectId: string & tags.Format<"uuid">;
//   body: IHrmTimeTrackingTask.IRequest;
// }): Promise<IPageIHrmTimeTrackingTask.ISummary> {
//   const records = await MyGlobal.prisma.hrm_time_tracking_tasks.findMany({
//     ...HrmTimeTrackingTaskAtSummaryTransformer.select(),
//     ...,
//   });
//   return {
//     pagination: {
//       current: ...,
//       limit: ...,
//       records: ...,
//       pages: ...,
//     },
//     data: await HrmTimeTrackingTaskAtSummaryTransformer.transformAll(records),
//   };
// }
// ```
//--------------------------------------------------------------