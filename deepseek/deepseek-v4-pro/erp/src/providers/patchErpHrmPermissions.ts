import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IErpHrmPermission } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmPermission";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIErpHrmPermission } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIErpHrmPermission";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { ErpHrmPermissionAtSummaryTransformer } from "../transformers/ErpHrmPermissionAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchErpHrmPermissions(props: {
  body: IErpHrmPermission.IRequest;
}): Promise<IPageIErpHrmPermission.ISummary> {
  const limit = props.body.limit ?? 100;
  const search = props.body.search;
  const whereInput = {
    ...(search
      ? {
          OR: [
            { key: { contains: search, mode: "insensitive" } },
            { description: { contains: search, mode: "insensitive" } },
          ],
        }
      : {}),
  } satisfies Prisma.erp_hrm_permissionsWhereInput;
  const cursor = props.body.cursor;
  const page = props.body.page ?? 1;
  const data = await MyGlobal.prisma.erp_hrm_permissions.findMany({
    where: whereInput,
    take: limit,
    ...(cursor
      ? { cursor: { id: cursor }, skip: 1 }
      : { skip: (page - 1) * limit }),
    ...ErpHrmPermissionAtSummaryTransformer.select(),
  });
  const total = await MyGlobal.prisma.erp_hrm_permissions.count({
    where: whereInput,
  });
  return {
    pagination: {
      current: cursor ? 1 : page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
    data: await ArrayUtil.asyncMap(
      data,
      ErpHrmPermissionAtSummaryTransformer.transform,
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
// import { IErpHrmPermission } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmPermission";
// import { IPageIErpHrmPermission } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIErpHrmPermission";
// import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function patchErpHrmPermissions(props: {
//   body: IErpHrmPermission.IRequest;
// }): Promise<IPageIErpHrmPermission.ISummary> {
//   const records = await MyGlobal.prisma.erp_hrm_permissions.findMany({
//     ...ErpHrmPermissionAtSummaryTransformer.select(),
//     ...,
//   });
//   return {
//     pagination: {
//       current: ...,
//       limit: ...,
//       records: ...,
//       pages: ...,
//     },
//     data: await ArrayUtil.asyncMap(records, ErpHrmPermissionAtSummaryTransformer.transform),
//   };
// }
// ```
//--------------------------------------------------------------