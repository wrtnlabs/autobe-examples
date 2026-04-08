import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmPermission } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPermission";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIHrmPermission } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmPermission";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { HrmPermissionAtSummaryTransformer } from "../transformers/HrmPermissionAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchHrmMemberPermissions(props: {
  member: MemberPayload;
  body: IHrmPermission.IRequest;
}): Promise<IPageIHrmPermission.ISummary> {
  const page = props.body.page ?? 1;
  const limitRaw = props.body.pageSize ?? props.body.limit ?? 20;
  const limit = Math.max(1, Math.min(limitRaw, 100));
  const skip = (page - 1) * limit;
  const whereInput: Prisma.hrm_permissionsWhereInput = {
    ...(props.body.search && {
      OR: [
        {
          permission_name: { contains: props.body.search, mode: "insensitive" },
        },
        { description: { contains: props.body.search, mode: "insensitive" } },
      ],
    }),
    ...(props.body.category && {
      permission_name: {
        startsWith: `${props.body.category}:`,
        mode: "insensitive",
      },
    }),
  };
  const orderByInput: Prisma.hrm_permissionsOrderByWithRelationInput =
    props.body.sort && props.body.order
      ? { [props.body.sort]: props.body.order }
      : { permission_name: "asc" };
  const [records, total] = await Promise.all([
    MyGlobal.prisma.hrm_permissions.findMany({
      where: whereInput,
      skip,
      take: limit,
      orderBy: orderByInput,
      ...HrmPermissionAtSummaryTransformer.select(),
    }),
    MyGlobal.prisma.hrm_permissions.count({
      where: whereInput,
    }),
  ]);
  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: total === 0 ? 0 : Math.ceil(total / limit),
    } satisfies IPage.IPagination,
    data: await ArrayUtil.asyncMap(
      records,
      HrmPermissionAtSummaryTransformer.transform,
    ),
  } satisfies IPageIHrmPermission.ISummary;
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
// import { IHrmPermission } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPermission";
// import { IPageIHrmPermission } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmPermission";
// import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function patchHrmMemberPermissions(props: {
//   member: MemberPayload;
//   body: IHrmPermission.IRequest;
// }): Promise<IPageIHrmPermission.ISummary> {
//   const records = await MyGlobal.prisma.hrm_permissions.findMany({
//     ...HrmPermissionAtSummaryTransformer.select(),
//     ...,
//   });
//   return {
//     pagination: {
//       current: ...,
//       limit: ...,
//       records: ...,
//       pages: ...,
//     },
//     data: await ArrayUtil.asyncMap(records, HrmPermissionAtSummaryTransformer.transform),
//   };
// }
// ```
//--------------------------------------------------------------