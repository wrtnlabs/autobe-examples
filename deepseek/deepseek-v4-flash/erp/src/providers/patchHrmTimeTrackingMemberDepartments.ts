import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmTimeTrackingDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingDepartment";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIHrmTimeTrackingDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmTimeTrackingDepartment";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { HrmTimeTrackingDepartmentAtSummaryTransformer } from "../transformers/HrmTimeTrackingDepartmentAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchHrmTimeTrackingMemberDepartments(props: {
  member: MemberPayload;
  body: IHrmTimeTrackingDepartment.IRequest;
}): Promise<IPageIHrmTimeTrackingDepartment.ISummary> {
  // Resolve organization context from member's employee record
  const employee =
    await MyGlobal.prisma.hrm_time_tracking_employees.findFirstOrThrow({
      where: {
        hrm_time_tracking_member_id: props.member.id,
        deleted_at: null,
      },
      select: {
        hrm_time_tracking_organization_id: true,
      },
    });
  const organizationId = employee.hrm_time_tracking_organization_id;
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  // Build WHERE clause — start with organization scope
  const whereInput = {
    hrm_time_tracking_organization_id: organizationId,
    ...(props.body.includeDeleted !== true ? { deleted_at: null } : {}),
    ...(props.body.search
      ? {
          OR: [
            {
              name: {
                contains: props.body.search,
                mode: "insensitive" as const,
              },
            },
            {
              description: {
                contains: props.body.search,
                mode: "insensitive" as const,
              },
            },
          ],
        }
      : {}),
    ...(props.body.name
      ? { name: { contains: props.body.name, mode: "insensitive" as const } }
      : {}),
    ...(props.body.parentId !== undefined
      ? { parent_id: props.body.parentId }
      : {}),
    ...(props.body.description !== undefined && props.body.description !== null
      ? {
          description: {
            contains: props.body.description,
            mode: "insensitive" as const,
          },
        }
      : {}),
  } satisfies Prisma.hrm_time_tracking_departmentsWhereInput;
  // Determine sort order — default to name ascending
  const sortField = props.body.sort ?? "name";
  const orderByInput = (
    sortField === "created_at"
      ? { created_at: "asc" as const }
      : sortField === "updated_at"
        ? { updated_at: "asc" as const }
        : { name: "asc" as const }
  ) satisfies Prisma.hrm_time_tracking_departmentsOrderByWithRelationInput;
  const records = await MyGlobal.prisma.hrm_time_tracking_departments.findMany({
    where: whereInput,
    skip,
    take: limit,
    orderBy: orderByInput,
    ...HrmTimeTrackingDepartmentAtSummaryTransformer.select(),
  });
  const total = await MyGlobal.prisma.hrm_time_tracking_departments.count({
    where: whereInput,
  });
  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
    data: await HrmTimeTrackingDepartmentAtSummaryTransformer.transformAll(
      records,
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
// import { IHrmTimeTrackingDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingDepartment";
// import { IPageIHrmTimeTrackingDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmTimeTrackingDepartment";
// import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function patchHrmTimeTrackingMemberDepartments(props: {
//   member: MemberPayload;
//   body: IHrmTimeTrackingDepartment.IRequest;
// }): Promise<IPageIHrmTimeTrackingDepartment.ISummary> {
//   const records = await MyGlobal.prisma.hrm_time_tracking_departments.findMany({
//     ...HrmTimeTrackingDepartmentAtSummaryTransformer.select(),
//     ...,
//   });
//   return {
//     pagination: {
//       current: ...,
//       limit: ...,
//       records: ...,
//       pages: ...,
//     },
//     data: await HrmTimeTrackingDepartmentAtSummaryTransformer.transformAll(records),
//   };
// }
// ```
//--------------------------------------------------------------