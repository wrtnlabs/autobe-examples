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
import { HrmPlatformTaskTransformer } from "../transformers/HrmPlatformTaskTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchHrmPlatformMemberTasks(props: {
  member: MemberPayload;
  body: IHrmPlatformTask.IRequest;
}): Promise<IPageIHrmPlatformTask> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  if (limit < 1) {
    throw new HttpException("Limit must be at least 1", 400);
  }
  if (limit > 100) {
    throw new HttpException("Limit must be at most 100", 400);
  }
  const employee = await MyGlobal.prisma.hrm_platform_employees.findFirst({
    where: {
      hrm_platform_member_id: props.member.id,
      deleted_at: null,
    },
    select: {
      id: true,
      hrm_platform_organization_id: true,
      role: {
        select: {
          name: true,
          built_in: true,
        },
      },
    },
  });
  if (employee === null || employee === undefined) {
    throw new HttpException("Employee record not found", 403);
  }
  const organizationId = employee.hrm_platform_organization_id;
  const hasOrgWideAccess =
    employee.role.built_in === true &&
    (employee.role.name === "Owner" || employee.role.name === "Manager");
  const dateFilters: Record<
    string,
    Prisma.DateTimeFilter | Prisma.DateTimeNullableFilter
  > = {};
  const createdFrom = props.body.createdAtFrom;
  const createdTo = props.body.createdAtTo;
  if (
    createdFrom !== undefined &&
    createdFrom !== null &&
    createdTo !== undefined &&
    createdTo !== null
  ) {
    dateFilters.created_at = {
      gte: new Date(createdFrom),
      lte: new Date(createdTo),
    } satisfies Prisma.DateTimeFilter;
  } else if (createdFrom !== undefined && createdFrom !== null) {
    dateFilters.created_at = {
      gte: new Date(createdFrom),
    } satisfies Prisma.DateTimeFilter;
  } else if (createdTo !== undefined && createdTo !== null) {
    dateFilters.created_at = {
      lte: new Date(createdTo),
    } satisfies Prisma.DateTimeFilter;
  }
  const updatedFrom = props.body.updatedAtFrom;
  const updatedTo = props.body.updatedAtTo;
  if (
    updatedFrom !== undefined &&
    updatedFrom !== null &&
    updatedTo !== undefined &&
    updatedTo !== null
  ) {
    dateFilters.updated_at = {
      gte: new Date(updatedFrom),
      lte: new Date(updatedTo),
    } satisfies Prisma.DateTimeFilter;
  } else if (updatedFrom !== undefined && updatedFrom !== null) {
    dateFilters.updated_at = {
      gte: new Date(updatedFrom),
    } satisfies Prisma.DateTimeFilter;
  } else if (updatedTo !== undefined && updatedTo !== null) {
    dateFilters.updated_at = {
      lte: new Date(updatedTo),
    } satisfies Prisma.DateTimeFilter;
  }
  const dueFrom = props.body.dueAtFrom;
  const dueTo = props.body.dueAtTo;
  if (
    dueFrom !== undefined &&
    dueFrom !== null &&
    dueTo !== undefined &&
    dueTo !== null
  ) {
    dateFilters.due_at = {
      gte: new Date(dueFrom),
      lte: new Date(dueTo),
    } satisfies Prisma.DateTimeNullableFilter;
  } else if (dueFrom !== undefined && dueFrom !== null) {
    dateFilters.due_at = {
      gte: new Date(dueFrom),
    } satisfies Prisma.DateTimeNullableFilter;
  } else if (dueTo !== undefined && dueTo !== null) {
    dateFilters.due_at = {
      lte: new Date(dueTo),
    } satisfies Prisma.DateTimeNullableFilter;
  }
  const searchFilter =
    props.body.search !== undefined &&
    props.body.search !== null &&
    props.body.search !== ""
      ? { title: { contains: props.body.search, mode: "insensitive" as const } }
      : {};
  const statusFilter =
    props.body.status !== undefined && props.body.status !== null
      ? { status: props.body.status }
      : {};
  const priorityFilter =
    props.body.priority !== undefined && props.body.priority !== null
      ? { priority: props.body.priority }
      : {};
  const assignedEmployeeFilter =
    props.body.assignedEmployeeId !== undefined
      ? { hrm_platform_employee_id: props.body.assignedEmployeeId }
      : {};
  const parentIdFilter =
    props.body.parentId !== undefined ? { parent_id: props.body.parentId } : {};
  if (hasOrgWideAccess) {
    let where: Prisma.hrm_platform_tasksWhereInput = {
      deleted_at: null,
      project: {
        hrm_platform_organization_id: organizationId,
      },
      ...dateFilters,
      ...searchFilter,
      ...statusFilter,
      ...priorityFilter,
      ...assignedEmployeeFilter,
      ...parentIdFilter,
    } satisfies Prisma.hrm_platform_tasksWhereInput;
    if (props.body.projectId !== undefined) {
      const resolvedWhere = {
        ...where,
        hrm_platform_project_id: props.body.projectId,
      } satisfies Prisma.hrm_platform_tasksWhereInput;
      where = resolvedWhere;
    }
    const orderByInput = buildTaskOrderBy(
      props.body.sortBy ?? "createdAt",
      props.body.sortOrder ?? "desc",
    );
    const tasks = await MyGlobal.prisma.hrm_platform_tasks.findMany({
      where,
      skip,
      take: limit,
      orderBy: orderByInput,
      ...HrmPlatformTaskTransformer.select(),
    });
    const total = await MyGlobal.prisma.hrm_platform_tasks.count({ where });
    const data = await ArrayUtil.asyncMap(
      tasks,
      HrmPlatformTaskTransformer.transform,
    );
    return {
      data,
      pagination: {
        current: page,
        limit,
        records: total,
        pages: Math.ceil(total / limit),
      } satisfies IPage.IPagination,
    };
  } else {
    const memberships =
      await MyGlobal.prisma.hrm_platform_project_memberships.findMany({
        where: {
          hrm_platform_employee_id: employee.id,
          deleted_at: null,
          project: {
            hrm_platform_organization_id: organizationId,
          },
        },
        select: {
          hrm_platform_project_id: true,
        },
      });
    let projectIds = memberships.map(
      (m: { hrm_platform_project_id: string }) => m.hrm_platform_project_id,
    );
    if (props.body.projectId !== undefined) {
      const targetProjectId = props.body.projectId;
      if (targetProjectId === null) {
        projectIds = [];
      } else {
        projectIds = projectIds.filter((id) => id === targetProjectId);
      }
    }
    if (projectIds.length === 0) {
      return {
        data: [],
        pagination: {
          current: page,
          limit,
          records: 0,
          pages: 0,
        } satisfies IPage.IPagination,
      };
    }
    const where = {
      deleted_at: null,
      hrm_platform_project_id: { in: projectIds },
      ...dateFilters,
      ...searchFilter,
      ...statusFilter,
      ...priorityFilter,
      ...assignedEmployeeFilter,
      ...parentIdFilter,
    } satisfies Prisma.hrm_platform_tasksWhereInput;
    const orderByInput = buildTaskOrderBy(
      props.body.sortBy ?? "createdAt",
      props.body.sortOrder ?? "desc",
    );
    const tasks = await MyGlobal.prisma.hrm_platform_tasks.findMany({
      where,
      skip,
      take: limit,
      orderBy: orderByInput,
      ...HrmPlatformTaskTransformer.select(),
    });
    const total = await MyGlobal.prisma.hrm_platform_tasks.count({ where });
    const data = await ArrayUtil.asyncMap(
      tasks,
      HrmPlatformTaskTransformer.transform,
    );
    return {
      data,
      pagination: {
        current: page,
        limit,
        records: total,
        pages: Math.ceil(total / limit),
      } satisfies IPage.IPagination,
    };
  }
}
function buildTaskOrderBy(
  sortBy: string,
  sortOrder: string,
):
  | Prisma.hrm_platform_tasksOrderByWithRelationInput
  | Prisma.hrm_platform_tasksOrderByWithRelationInput[] {
  const direction: "asc" | "desc" = sortOrder === "asc" ? "asc" : "desc";
  const fieldMap: Record<string, string> = {
    createdAt: "created_at",
    updatedAt: "updated_at",
    dueAt: "due_at",
    title: "title",
    status: "status",
    priority: "priority",
  };
  const prismaField = fieldMap[sortBy] ?? "created_at";
  if (sortBy === "priority") {
    return [{ priority: "asc" as const }, { created_at: direction }];
  }
  const entry: Record<string, "asc" | "desc"> = {};
  entry[prismaField] = direction;
  return [{ [prismaField]: direction }];
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
// export async function patchHrmPlatformMemberTasks(props: {
//   member: MemberPayload;
//   body: IHrmPlatformTask.IRequest;
// }): Promise<IPageIHrmPlatformTask> {
//   const records = await MyGlobal.prisma.hrm_platform_tasks.findMany({
//     ...HrmPlatformTaskTransformer.select(),
//     ...,
//   });
//   return {
//     pagination: {
//       current: ...,
//       limit: ...,
//       records: ...,
//       pages: ...,
//     },
//     data: await ArrayUtil.asyncMap(records, HrmPlatformTaskTransformer.transform),
//   };
// }
// ```
//--------------------------------------------------------------