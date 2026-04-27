import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmTimeTrackingDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingDepartment";
import { IHrmTimeTrackingEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingEmployee";
import { IHrmTimeTrackingMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingMember";
import { IHrmTimeTrackingOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingOrganization";
import { IHrmTimeTrackingProjectMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingProjectMember";
import { IHrmTimeTrackingRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingRole";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIHrmTimeTrackingProjectMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmTimeTrackingProjectMember";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { HrmTimeTrackingProjectMemberAtSummaryTransformer } from "../transformers/HrmTimeTrackingProjectMemberAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

// DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
export async function patchHrmTimeTrackingMemberProjectsProjectIdMembers(props: {
  member: MemberPayload;
  projectId: string & tags.Format<"uuid">;
  body: IHrmTimeTrackingProjectMember.IRequest;
}): Promise<IPageIHrmTimeTrackingProjectMember.ISummary> {
  // 1. Validate project exists and get organization context
  const project =
    await MyGlobal.prisma.hrm_time_tracking_projects.findUniqueOrThrow({
      where: { id: props.projectId },
      select: { id: true, hrm_time_tracking_organization_id: true },
    });
  // 2. Find employee for current member in this organization
  const employee = await MyGlobal.prisma.hrm_time_tracking_employees.findFirst({
    where: {
      hrm_time_tracking_member_id: props.member.id,
      hrm_time_tracking_organization_id:
        project.hrm_time_tracking_organization_id,
      deleted_at: null,
    },
    select: { id: true, hrm_time_tracking_role_id: true },
  });
  if (employee === null) {
    throw new HttpException("Forbidden", 403);
  }
  // 3. Check permissions - must have project:view
  const permissionRecords =
    await MyGlobal.prisma.hrm_time_tracking_role_permissions.findMany({
      where: {
        hrm_time_tracking_role_id: employee.hrm_time_tracking_role_id,
        permission_code: { in: ["project:view", "project:manage"] },
        deleted_at: null,
      },
      select: { permission_code: true },
    });
  const permissionSet = permissionRecords.map((r) => r.permission_code);
  const hasProjectView = permissionSet.includes("project:view");
  const hasProjectManage = permissionSet.includes("project:manage");
  if (!hasProjectView) {
    throw new HttpException("Forbidden", 403);
  }
  // 4. Non-managers must be project members to view this project's members
  if (!hasProjectManage) {
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
  }
  // 5. Build where clause (complex WHERE — intermediate variable allowed)
  const whereInput: Prisma.hrm_time_tracking_project_membersWhereInput = {
    hrm_time_tracking_project_id: props.projectId,
  };
  // Handle includeDeleted filter
  if (!props.body.includeDeleted) {
    whereInput.deleted_at = null;
  }
  // Handle role filter
  if (props.body.role !== undefined) {
    whereInput.role = props.body.role;
  }
  // Handle employeeName filter (partial match on member display_name)
  if (props.body.employeeName !== undefined) {
    whereInput.employee = {
      member: {
        display_name: {
          contains: props.body.employeeName,
          mode: "insensitive",
        },
      },
    };
  }
  // 6. Parse pagination
  const page: number = props.body.page ?? 1;
  const limit: number = props.body.limit ?? 100;
  const skip: number = (page - 1) * limit;
  // 7. Parse sort
  const defaultDirection: "asc" = "asc";
  const sortString: string | undefined = props.body.sort;
  let orderBy: Prisma.hrm_time_tracking_project_membersOrderByWithRelationInput =
    {
      created_at: defaultDirection,
    } satisfies Prisma.hrm_time_tracking_project_membersOrderByWithRelationInput;
  if (sortString !== undefined) {
    const negative: boolean = sortString.startsWith("-");
    const direction: "asc" | "desc" = negative ? "desc" : "asc";
    const field: string = negative ? sortString.substring(1) : sortString;
    if (field === "created_at") {
      orderBy = {
        created_at: direction,
      } satisfies Prisma.hrm_time_tracking_project_membersOrderByWithRelationInput;
    } else if (field === "role") {
      orderBy = {
        role: direction,
      } satisfies Prisma.hrm_time_tracking_project_membersOrderByWithRelationInput;
    } else if (field === "employee_name") {
      orderBy = {
        employee: {
          member: {
            display_name: direction,
          },
        },
      } satisfies Prisma.hrm_time_tracking_project_membersOrderByWithRelationInput;
    }
  }
  // 8. Query total count first, then data (sequential — MUST NOT use Promise.all)
  const total: number =
    await MyGlobal.prisma.hrm_time_tracking_project_members.count({
      where: whereInput,
    });
  const records =
    await MyGlobal.prisma.hrm_time_tracking_project_members.findMany({
      where: whereInput,
      skip,
      take: limit,
      orderBy,
      ...HrmTimeTrackingProjectMemberAtSummaryTransformer.select(),
    });
  // 9. Transform and return paginated response
  const pages: number = total === 0 ? 0 : Math.ceil(total / limit);
  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: pages,
    } satisfies IPage.IPagination,
    data: await ArrayUtil.asyncMap(
      records,
      HrmTimeTrackingProjectMemberAtSummaryTransformer.transform,
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
// import { IHrmTimeTrackingProjectMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingProjectMember";
// import { IPageIHrmTimeTrackingProjectMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmTimeTrackingProjectMember";
// import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
// import { IHrmTimeTrackingEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingEmployee";
// import { IHrmTimeTrackingMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingMember";
// import { IHrmTimeTrackingRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingRole";
// import { IHrmTimeTrackingOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingOrganization";
// import { IHrmTimeTrackingDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingDepartment";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function patchHrmTimeTrackingMemberProjectsProjectIdMembers(props: {
//   member: MemberPayload;
//   projectId: string & tags.Format<"uuid">;
//   body: IHrmTimeTrackingProjectMember.IRequest;
// }): Promise<IPageIHrmTimeTrackingProjectMember.ISummary> {
//   const records = await MyGlobal.prisma.hrm_time_tracking_project_members.findMany({
//     ...HrmTimeTrackingProjectMemberAtSummaryTransformer.select(),
//     ...,
//   });
//   return {
//     pagination: {
//       current: ...,
//       limit: ...,
//       records: ...,
//       pages: ...,
//     },
//     data: await ArrayUtil.asyncMap(records, HrmTimeTrackingProjectMemberAtSummaryTransformer.transform),
//   };
// }
// ```
//--------------------------------------------------------------