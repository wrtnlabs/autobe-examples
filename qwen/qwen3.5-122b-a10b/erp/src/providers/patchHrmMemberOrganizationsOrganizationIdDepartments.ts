import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmDepartment";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIHrmDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmDepartment";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { HrmDepartmentAtSummaryTransformer } from "../transformers/HrmDepartmentAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchHrmMemberOrganizationsOrganizationIdDepartments(props: {
  member: MemberPayload;
  organizationId: string & tags.Format<"uuid">;
  body: IHrmDepartment.IRequest;
}): Promise<IPageIHrmDepartment.ISummary> {
  const page: number = props.body.page ?? 1;
  const limit: number = props.body.limit ?? 100;
  const cursor: string | undefined = props.body.cursor;
  const sortBy: "name" | "created_at" = props.body.sort_by ?? "name";
  const sortOrder: "asc" | "desc" = props.body.sort_order ?? "asc";
  const whereInput: Prisma.hrm_departmentsWhereInput = {
    organization_id: props.organizationId,
    deleted_at: null,
    ...(props.body.search !== undefined &&
      props.body.search !== "" && {
        name: { contains: props.body.search, mode: "insensitive" },
      }),
    ...(props.body.parent_department_id !== undefined && {
      parent_department_id: props.body.parent_department_id ?? null,
    }),
  };
  const orderByInput: Prisma.hrm_departmentsOrderByWithRelationInput = {
    [sortBy]: sortOrder,
  };
  const records = await MyGlobal.prisma.hrm_departments.findMany({
    where: whereInput,
    orderBy: orderByInput,
    ...HrmDepartmentAtSummaryTransformer.select(),
    ...(cursor !== undefined
      ? { cursor: { id: cursor }, skip: 1, take: limit }
      : { skip: (page - 1) * limit, take: limit }),
  });
  const total: number = await MyGlobal.prisma.hrm_departments.count({
    where: whereInput,
  });
  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
    data: await HrmDepartmentAtSummaryTransformer.transformAll(records),
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
// import { IHrmDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmDepartment";
// import { IPageIHrmDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmDepartment";
// import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function patchHrmMemberOrganizationsOrganizationIdDepartments(props: {
//   member: MemberPayload;
//   organizationId: string & tags.Format<"uuid">;
//   body: IHrmDepartment.IRequest;
// }): Promise<IPageIHrmDepartment.ISummary> {
//   const records = await MyGlobal.prisma.hrm_departments.findMany({
//     ...HrmDepartmentAtSummaryTransformer.select(),
//     ...,
//   });
//   return {
//     pagination: {
//       current: ...,
//       limit: ...,
//       records: ...,
//       pages: ...,
//     },
//     data: await HrmDepartmentAtSummaryTransformer.transformAll(records),
//   };
// }
// ```
//--------------------------------------------------------------