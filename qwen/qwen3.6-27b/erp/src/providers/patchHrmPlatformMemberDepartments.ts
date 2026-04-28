import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmPlatformDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformDepartment";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIHrmPlatformDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmPlatformDepartment";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { HrmPlatformDepartmentAtSummaryTransformer } from "../transformers/HrmPlatformDepartmentAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchHrmPlatformMemberDepartments(props: {
  member: MemberPayload;
  body: IHrmPlatformDepartment.IRequest;
}): Promise<IPageIHrmPlatformDepartment.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  const employee =
    await MyGlobal.prisma.hrm_platform_employees.findFirstOrThrow({
      where: {
        hrm_platform_member_id: props.member.id,
      },
      select: {
        hrm_platform_organization_id: true,
      },
    });
  const baseWhere: Prisma.hrm_platform_departmentsWhereInput = {
    hrm_platform_organization_id: employee.hrm_platform_organization_id,
  };
  const where: Prisma.hrm_platform_departmentsWhereInput = {
    ...baseWhere,
    ...(props.body.parent_department_id !== undefined && {
      hrm_platform_parent_department_id:
        props.body.parent_department_id ?? null,
    }),
    ...(props.body.status === "deleted"
      ? {
          deleted_at: {
            not: null,
          },
        }
      : { deleted_at: null }),
    ...(props.body.name_search !== undefined &&
      props.body.name_search.length > 0 && {
        name: {
          contains: props.body.name_search,
          mode: "insensitive",
        },
      }),
  };
  const sortDir =
    props.body.sort_order === "desc" ? ("desc" as const) : ("asc" as const);
  const orderBy: Prisma.hrm_platform_departmentsOrderByWithRelationInput =
    props.body.sort_by === "name"
      ? {
          name: sortDir,
        }
      : props.body.sort_by === "updated_at"
        ? {
            updated_at: sortDir,
          }
        : {
            created_at: sortDir,
          };
  const records = await MyGlobal.prisma.hrm_platform_departments.findMany({
    where,
    skip,
    take: limit,
    orderBy,
    ...HrmPlatformDepartmentAtSummaryTransformer.select(),
  });
  const total = await MyGlobal.prisma.hrm_platform_departments.count({
    where,
  });
  return {
    pagination: {
      current: page,
      limit,
      records: total,
      pages: total === 0 ? 0 : Math.ceil(total / limit),
    },
    data: await HrmPlatformDepartmentAtSummaryTransformer.transformAll(records),
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
// import { IHrmPlatformDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformDepartment";
// import { IPageIHrmPlatformDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmPlatformDepartment";
// import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function patchHrmPlatformMemberDepartments(props: {
//   member: MemberPayload;
//   body: IHrmPlatformDepartment.IRequest;
// }): Promise<IPageIHrmPlatformDepartment.ISummary> {
//   const records = await MyGlobal.prisma.hrm_platform_departments.findMany({
//     ...HrmPlatformDepartmentAtSummaryTransformer.select(),
//     ...,
//   });
//   return {
//     pagination: {
//       current: ...,
//       limit: ...,
//       records: ...,
//       pages: ...,
//     },
//     data: await HrmPlatformDepartmentAtSummaryTransformer.transformAll(records),
//   };
// }
// ```
//--------------------------------------------------------------