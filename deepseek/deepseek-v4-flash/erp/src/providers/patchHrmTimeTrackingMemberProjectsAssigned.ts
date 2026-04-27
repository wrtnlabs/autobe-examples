import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmTimeTrackingMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingMember";
import { IHrmTimeTrackingOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingOrganization";
import { IHrmTimeTrackingProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingProject";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIHrmTimeTrackingProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmTimeTrackingProject";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { HrmTimeTrackingProjectAtSummaryTransformer } from "../transformers/HrmTimeTrackingProjectAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchHrmTimeTrackingMemberProjectsAssigned(props: {
  member: MemberPayload;
  body: IHrmTimeTrackingProject.IRequest;
}): Promise<IPageIHrmTimeTrackingProject.ISummary> {
  // 1. Resolve the current employee record for the authenticated member
  const employee = await MyGlobal.prisma.hrm_time_tracking_employees.findFirst({
    where: {
      hrm_time_tracking_member_id: props.member.id,
      status: "active",
      deleted_at: null,
    },
    select: {
      id: true,
      hrm_time_tracking_organization_id: true,
    },
  });
  if (employee === null) {
    const page = props.body.page ?? 1;
    const limit = props.body.limit ?? 100;
    return {
      pagination: {
        current: page,
        limit,
        records: 0,
        pages: 0,
      },
      data: [],
    };
  }
  // 2. Build base where clause for project members
  const whereProjectMember: Prisma.hrm_time_tracking_project_membersWhereInput =
    {
      hrm_time_tracking_employee_id: employee.id,
      deleted_at: null,
      project: {
        deleted_at: null,
        hrm_time_tracking_organization_id:
          employee.hrm_time_tracking_organization_id,
      },
    };
  // 3. Apply optional filters
  const projectFilter =
    whereProjectMember.project as Prisma.hrm_time_tracking_projectsWhereInput;
  // 3a. Status filter (single string or array)
  if (props.body.status !== undefined) {
    if (typeof props.body.status === "string") {
      projectFilter.status = props.body.status;
    } else {
      projectFilter.status = { in: props.body.status };
    }
  }
  // 3b. Search filter (case-insensitive partial match on name)
  if (props.body.search !== undefined) {
    projectFilter.name = {
      contains: props.body.search,
      mode: "insensitive",
    };
  }
  // 3c. Explicit name filter (case-insensitive partial match)
  if (props.body.name !== undefined) {
    projectFilter.name = {
      contains: props.body.name,
      mode: "insensitive",
    };
  }
  // 4. Handle sort
  const sortField = props.body.sort ?? "created_at";
  const descending = sortField.startsWith("-");
  const fieldName = descending ? sortField.substring(1) : sortField;
  let orderBy: Prisma.hrm_time_tracking_projectsOrderByWithRelationInput;
  switch (fieldName) {
    case "name":
      orderBy = { name: descending ? "desc" : "asc" };
      break;
    case "status":
      orderBy = { status: descending ? "desc" : "asc" };
      break;
    case "started_at":
      orderBy = { started_at: descending ? "desc" : "asc" };
      break;
    case "ended_at":
      orderBy = { ended_at: descending ? "desc" : "asc" };
      break;
    case "budget_hours":
      orderBy = { budget_hours: descending ? "desc" : "asc" };
      break;
    default:
      orderBy = { created_at: "desc" };
  }
  // 5. Pagination
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  // 6. Count total matching records
  const total = await MyGlobal.prisma.hrm_time_tracking_project_members.count({
    where: whereProjectMember,
  });
  // 7. Query project members with project data
  const projectMembers =
    await MyGlobal.prisma.hrm_time_tracking_project_members.findMany({
      where: whereProjectMember,
      skip,
      take: limit,
      orderBy: {
        project: orderBy,
      },
      select: {
        id: true,
        project: HrmTimeTrackingProjectAtSummaryTransformer.select(),
      },
    });
  // 8. Transform to response
  const data = await ArrayUtil.asyncMap(projectMembers, async (pm) =>
    HrmTimeTrackingProjectAtSummaryTransformer.transform(pm.project),
  );
  return {
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
    data,
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
// import { IHrmTimeTrackingProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingProject";
// import { IPageIHrmTimeTrackingProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmTimeTrackingProject";
// import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
// import { IHrmTimeTrackingOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingOrganization";
// import { IHrmTimeTrackingMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingMember";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function patchHrmTimeTrackingMemberProjectsAssigned(props: {
//   member: MemberPayload;
//   body: IHrmTimeTrackingProject.IRequest;
// }): Promise<IPageIHrmTimeTrackingProject.ISummary> {
//   const records = await MyGlobal.prisma.hrm_time_tracking_projects.findMany({
//     ...HrmTimeTrackingProjectAtSummaryTransformer.select(),
//     ...,
//   });
//   return {
//     pagination: {
//       current: ...,
//       limit: ...,
//       records: ...,
//       pages: ...,
//     },
//     data: await ArrayUtil.asyncMap(records, HrmTimeTrackingProjectAtSummaryTransformer.transform),
//   };
// }
// ```
//--------------------------------------------------------------