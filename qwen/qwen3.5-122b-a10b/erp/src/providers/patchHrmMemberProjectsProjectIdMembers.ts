import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmDepartment";
import { IHrmEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmEmployee";
import { IHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmMember";
import { IHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmOrganization";
import { IHrmProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmProject";
import { IHrmProjectMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmProjectMember";
import { IHrmRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmRole";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIHrmProjectMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmProjectMember";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { HrmProjectMemberAtSummaryTransformer } from "../transformers/HrmProjectMemberAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchHrmMemberProjectsProjectIdMembers(props: {
  member: MemberPayload;
  projectId: string & tags.Format<"uuid">;
  body: IHrmProjectMember.IRequest;
}): Promise<IPageIHrmProjectMember.ISummary> {
  // Validate project exists
  const project = await MyGlobal.prisma.hrm_projects.findUnique({
    where: { id: props.projectId },
    select: { id: true, hrm_organization_id: true },
  });
  if (project === null) {
    throw new HttpException("Project not found", 404);
  }
  // Find employee record for the authenticated member
  const employee = await MyGlobal.prisma.hrm_employees.findFirst({
    where: {
      user_id: props.member.id,
      organization_id: project.hrm_organization_id,
      deleted_at: null,
    },
    select: { id: true },
  });
  if (employee === null) {
    throw new HttpException("Forbidden", 403);
  }
  // Verify user has permission to view project members (must be a project member)
  const projectMember = await MyGlobal.prisma.hrm_project_members.findFirst({
    where: {
      project_id: props.projectId,
      employee_id: employee.id,
      deleted_at: null,
    },
    select: { role: true },
  });
  if (projectMember === null) {
    throw new HttpException("Forbidden", 403);
  }
  // Build where clause
  const whereInput: Prisma.hrm_project_membersWhereInput = {
    project_id: props.projectId,
    deleted_at: null,
  };
  const andConditions: Prisma.hrm_project_membersWhereInput[] = [];
  // Role filter
  if (props.body.role !== undefined) {
    andConditions.push({
      role: props.body.role,
    });
  }
  // Employee status filter
  if (props.body.status !== undefined) {
    andConditions.push({
      employee: {
        status: props.body.status,
      },
    });
  }
  // Search filter (employee email or position)
  if (props.body.search !== undefined && props.body.search.length > 0) {
    andConditions.push({
      OR: [
        {
          employee: {
            user: {
              email: {
                contains: props.body.search,
                mode: "insensitive",
              },
            },
          },
        },
        {
          employee: {
            position: {
              contains: props.body.search,
              mode: "insensitive",
            },
          },
        },
      ],
    });
  }
  if (andConditions.length > 0) {
    whereInput.AND = andConditions;
  }
  // Pagination
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  // Sorting
  const orderBy: Prisma.hrm_project_membersOrderByWithRelationInput[] = [];
  if (props.body.sort_by !== undefined) {
    const sortOrder: "asc" | "desc" = props.body.sort_order ?? "desc";
    if (props.body.sort_by === "created_at") {
      orderBy.push({ created_at: sortOrder });
    } else if (props.body.sort_by === "employee_name") {
      // Sort by employee position as a proxy for name (no display_name on members)
      orderBy.push({
        employee: {
          position: sortOrder,
        },
      });
    } else if (props.body.sort_by === "role") {
      orderBy.push({ role: sortOrder });
    } else {
      orderBy.push({ created_at: "desc" });
    }
  } else {
    orderBy.push({ created_at: "desc" });
  }
  // Get records
  const records = await MyGlobal.prisma.hrm_project_members.findMany({
    where: whereInput,
    orderBy: orderBy,
    skip,
    take: limit,
    ...HrmProjectMemberAtSummaryTransformer.select(),
  } satisfies Prisma.hrm_project_membersFindManyArgs);
  // Get total count
  const total = await MyGlobal.prisma.hrm_project_members.count({
    where: whereInput,
  });
  // Transform records
  const data = await ArrayUtil.asyncMap(
    records,
    HrmProjectMemberAtSummaryTransformer.transform,
  );
  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
    data: data,
  } satisfies IPageIHrmProjectMember.ISummary;
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
// import { IHrmProjectMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmProjectMember";
// import { IPageIHrmProjectMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmProjectMember";
// import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
// import { IHrmEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmEmployee";
// import { IHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmMember";
// import { IHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmOrganization";
// import { IHrmRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmRole";
// import { IHrmDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmDepartment";
// import { IHrmProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmProject";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function patchHrmMemberProjectsProjectIdMembers(props: {
//   member: MemberPayload;
//   projectId: string & tags.Format<"uuid">;
//   body: IHrmProjectMember.IRequest;
// }): Promise<IPageIHrmProjectMember.ISummary> {
//   const records = await MyGlobal.prisma.hrm_project_members.findMany({
//     ...HrmProjectMemberAtSummaryTransformer.select(),
//     ...,
//   });
//   return {
//     pagination: {
//       current: ...,
//       limit: ...,
//       records: ...,
//       pages: ...,
//     },
//     data: await ArrayUtil.asyncMap(records, HrmProjectMemberAtSummaryTransformer.transform),
//   };
// }
// ```
//--------------------------------------------------------------