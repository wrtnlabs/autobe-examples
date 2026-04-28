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

export async function patchHrmPlatformMemberProjectsProjectIdTasks(props: {
  member: MemberPayload;
  projectId: string & tags.Format<"uuid">;
  body: IHrmPlatformTask.IRequest;
}): Promise<IPageIHrmPlatformTask.ISummary> {
  // Step 1: Project authorization validation
  const project = await MyGlobal.prisma.hrm_platform_projects.findUniqueOrThrow(
    {
      where: {
        id: props.projectId,
        deleted_at: null,
      },
      select: {
        hrm_platform_organization_id: true,
      },
    },
  );
  // Step 2: Employee record validation for member in project's organization
  const employee =
    await MyGlobal.prisma.hrm_platform_employees.findFirstOrThrow({
      where: {
        hrm_platform_member_id: props.member.id,
        hrm_platform_organization_id: project.hrm_platform_organization_id,
        deleted_at: null,
      },
      select: {
        id: true,
      },
    });
  // Step 3: Project membership validation
  await MyGlobal.prisma.hrm_platform_project_memberships.findFirstOrThrow({
    where: {
      hrm_platform_employee_id: employee.id,
      hrm_platform_project_id: props.projectId,
      deleted_at: null,
    },
  });
  // Step 4: Construct where clause with base filters
  let whereInput: Prisma.hrm_platform_tasksWhereInput = {
    hrm_platform_project_id: props.projectId,
    deleted_at: null,
  };
  // Apply optional status filter
  if (props.body.status !== undefined && props.body.status !== null) {
    whereInput = { ...whereInput, status: props.body.status };
  }
  // Apply optional priority filter
  if (props.body.priority !== undefined && props.body.priority !== null) {
    whereInput = { ...whereInput, priority: props.body.priority };
  }
  // Apply optional assigned employee filter
  if (
    props.body.assignedEmployeeId !== undefined &&
    props.body.assignedEmployeeId !== null
  ) {
    whereInput = {
      ...whereInput,
      hrm_platform_employee_id: props.body.assignedEmployeeId,
    };
  }
  // Apply optional parent task filter
  if (props.body.parentId !== undefined && props.body.parentId !== null) {
    whereInput = { ...whereInput, parent_id: props.body.parentId };
  }
  // Apply created_at date range filters
  if (
    props.body.createdAtFrom !== undefined ||
    props.body.createdAtTo !== undefined
  ) {
    const createdAtFilter: Prisma.DateTimeFilter = {};
    if (props.body.createdAtFrom !== undefined) {
      createdAtFilter.gte = new Date(props.body.createdAtFrom);
    }
    if (props.body.createdAtTo !== undefined) {
      createdAtFilter.lte = new Date(props.body.createdAtTo);
    }
    whereInput = { ...whereInput, created_at: createdAtFilter };
  }
  // Apply due_at date range filters
  if (props.body.dueAtFrom !== undefined || props.body.dueAtTo !== undefined) {
    const dueAtFilter: Prisma.DateTimeFilter = {};
    if (props.body.dueAtFrom !== undefined) {
      dueAtFilter.gte = new Date(props.body.dueAtFrom);
    }
    if (props.body.dueAtTo !== undefined) {
      dueAtFilter.lte = new Date(props.body.dueAtTo);
    }
    whereInput = { ...whereInput, due_at: dueAtFilter };
  }
  // Apply updated_at date range filters
  if (
    props.body.updatedAtFrom !== undefined ||
    props.body.updatedAtTo !== undefined
  ) {
    const updatedAtFilter: Prisma.DateTimeFilter = {};
    if (props.body.updatedAtFrom !== undefined) {
      updatedAtFilter.gte = new Date(props.body.updatedAtFrom);
    }
    if (props.body.updatedAtTo !== undefined) {
      updatedAtFilter.lte = new Date(props.body.updatedAtTo);
    }
    whereInput = { ...whereInput, updated_at: updatedAtFilter };
  }
  // Apply search filter on title and description
  if (props.body.search !== undefined && props.body.search.length > 0) {
    const searchTerm = props.body.search;
    whereInput = {
      ...whereInput,
      OR: [
        {
          title: {
            contains: searchTerm,
            mode: "insensitive",
          },
        },
        {
          description: {
            contains: searchTerm,
            mode: "insensitive",
          },
        },
      ],
    };
  }
  // Step 5: Construct order by clause
  const sortOrder: Prisma.SortOrder =
    props.body.sortOrder === "asc"
      ? Prisma.SortOrder.asc
      : Prisma.SortOrder.desc;
  const orderByInput: Prisma.hrm_platform_tasksOrderByWithRelationInput =
    props.body.sortBy === "dueDate"
      ? { due_at: sortOrder }
      : props.body.sortBy === "priority"
        ? { priority: sortOrder }
        : props.body.sortBy === "status"
          ? { status: sortOrder }
          : props.body.sortBy === "title"
            ? { title: sortOrder }
            : ({
                created_at: Prisma.SortOrder.desc,
              } satisfies Prisma.hrm_platform_tasksOrderByWithRelationInput);
  // Step 6: Pagination parameters
  const page: number = props.body.page ?? 1;
  const limit: number = props.body.limit ?? 100;
  const skip: number = (page - 1) * limit;
  // Step 7: Fetch paginated records with transformer select
  const records = await MyGlobal.prisma.hrm_platform_tasks.findMany({
    where: whereInput,
    skip,
    take: limit,
    orderBy: orderByInput,
    ...HrmPlatformTaskAtSummaryTransformer.select(),
  });
  // Step 8: Get total count for pagination
  const total = await MyGlobal.prisma.hrm_platform_tasks.count({
    where: whereInput,
  });
  // Step 9: Return paginated response with transformed data
  return {
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
    data: await HrmPlatformTaskAtSummaryTransformer.transformAll(records),
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
// import { IHrmPlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganization";
// import { IHrmPlatformEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformEmployee";
// import { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
// import { IHrmPlatformRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformRole";
// import { IHrmPlatformDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformDepartment";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function patchHrmPlatformMemberProjectsProjectIdTasks(props: {
//   member: MemberPayload;
//   projectId: string & tags.Format<"uuid">;
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