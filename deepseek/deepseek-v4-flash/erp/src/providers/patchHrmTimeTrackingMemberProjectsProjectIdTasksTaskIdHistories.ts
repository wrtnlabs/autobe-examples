import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmTimeTrackingDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingDepartment";
import { IHrmTimeTrackingEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingEmployee";
import { IHrmTimeTrackingMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingMember";
import { IHrmTimeTrackingOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingOrganization";
import { IHrmTimeTrackingRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingRole";
import { IHrmTimeTrackingTaskHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingTaskHistory";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIHrmTimeTrackingTaskHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmTimeTrackingTaskHistory";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { HrmTimeTrackingTaskHistoryAtSummaryTransformer } from "../transformers/HrmTimeTrackingTaskHistoryAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchHrmTimeTrackingMemberProjectsProjectIdTasksTaskIdHistories(props: {
  member: MemberPayload;
  projectId: string & tags.Format<"uuid">;
  taskId: string & tags.Format<"uuid">;
  body: IHrmTimeTrackingTaskHistory.IRequest;
}): Promise<IPageIHrmTimeTrackingTaskHistory.ISummary> {
  // Step 1: Verify the task exists and belongs to the specified project
  const task = await MyGlobal.prisma.hrm_time_tracking_tasks.findFirstOrThrow({
    where: {
      id: props.taskId,
      hrm_time_tracking_project_id: props.projectId,
      deleted_at: null,
    },
    select: {
      id: true,
      hrm_time_tracking_project_id: true,
    },
  });
  // Step 2: Get the project's organization for scoping
  const project =
    await MyGlobal.prisma.hrm_time_tracking_projects.findFirstOrThrow({
      where: {
        id: props.projectId,
        deleted_at: null,
      },
      select: {
        id: true,
        hrm_time_tracking_organization_id: true,
      },
    });
  // Step 3: Find the authenticated member's employee record in the project's organization
  const employee =
    await MyGlobal.prisma.hrm_time_tracking_employees.findFirstOrThrow({
      where: {
        hrm_time_tracking_member_id: props.member.id,
        hrm_time_tracking_organization_id:
          project.hrm_time_tracking_organization_id,
        deleted_at: null,
      },
      select: {
        id: true,
      },
    });
  // Step 4: Enforce task visibility — employee must be a project member
  // Analysis section ID 511: Employees can only view tasks belonging to projects they are assigned to
  const projectMember =
    await MyGlobal.prisma.hrm_time_tracking_project_members.findFirst({
      where: {
        hrm_time_tracking_project_id: props.projectId,
        hrm_time_tracking_employee_id: employee.id,
        deleted_at: null,
      },
      select: {
        id: true,
      },
    });
  if (projectMember === null) {
    throw new HttpException("Forbidden", 403);
  }
  // Step 5: Build the where clause with optional filters
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  const where: Prisma.hrm_time_tracking_task_historiesWhereInput = {
    hrm_time_tracking_task_id: props.taskId,
    deleted_at: null,
  };
  if (props.body.employee_id !== undefined) {
    where.hrm_time_tracking_employee_id = props.body.employee_id;
  }
  if (props.body.previous_status !== undefined) {
    where.previous_status = props.body.previous_status;
  }
  if (props.body.new_status !== undefined) {
    where.new_status = props.body.new_status;
  }
  if (
    props.body.created_at_from !== undefined &&
    props.body.created_at_to !== undefined
  ) {
    where.created_at = {
      gte: props.body.created_at_from,
      lte: props.body.created_at_to,
    };
  } else if (props.body.created_at_from !== undefined) {
    where.created_at = {
      gte: props.body.created_at_from,
    };
  } else if (props.body.created_at_to !== undefined) {
    where.created_at = {
      lte: props.body.created_at_to,
    };
  }
  if (props.body.search !== undefined) {
    where.OR = [
      { previous_status: { contains: props.body.search, mode: "insensitive" } },
      { new_status: { contains: props.body.search, mode: "insensitive" } },
      {
        employee: {
          member: {
            display_name: { contains: props.body.search, mode: "insensitive" },
          },
        },
      },
    ];
  }
  // Step 6: Build orderBy
  const orderBy: Prisma.hrm_time_tracking_task_historiesOrderByWithRelationInput =
    props.body.sort === "created_at.asc"
      ? { created_at: "asc" }
      : { created_at: "desc" };
  // Step 7: Execute queries
  const records =
    await MyGlobal.prisma.hrm_time_tracking_task_histories.findMany({
      where,
      skip,
      take: limit,
      orderBy,
      ...HrmTimeTrackingTaskHistoryAtSummaryTransformer.select(),
    });
  const total = await MyGlobal.prisma.hrm_time_tracking_task_histories.count({
    where,
  });
  // Step 8: Return paginated response
  return {
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
    data: await ArrayUtil.asyncMap(
      records,
      HrmTimeTrackingTaskHistoryAtSummaryTransformer.transform,
    ),
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
// import { IHrmTimeTrackingTaskHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingTaskHistory";
// import { IPageIHrmTimeTrackingTaskHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmTimeTrackingTaskHistory";
// import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
// import { IHrmTimeTrackingEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingEmployee";
// import { IHrmTimeTrackingMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingMember";
// import { IHrmTimeTrackingRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingRole";
// import { IHrmTimeTrackingOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingOrganization";
// import { IHrmTimeTrackingDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingDepartment";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function patchHrmTimeTrackingMemberProjectsProjectIdTasksTaskIdHistories(props: {
//   member: MemberPayload;
//   projectId: string & tags.Format<"uuid">;
//   taskId: string & tags.Format<"uuid">;
//   body: IHrmTimeTrackingTaskHistory.IRequest;
// }): Promise<IPageIHrmTimeTrackingTaskHistory.ISummary> {
//   const records = await MyGlobal.prisma.hrm_time_tracking_task_histories.findMany({
//     ...HrmTimeTrackingTaskHistoryAtSummaryTransformer.select(),
//     ...,
//   });
//   return {
//     pagination: {
//       current: ...,
//       limit: ...,
//       records: ...,
//       pages: ...,
//     },
//     data: await ArrayUtil.asyncMap(records, HrmTimeTrackingTaskHistoryAtSummaryTransformer.transform),
//   };
// }
// ```
//--------------------------------------------------------------