import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IErpHrmAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmAdmin";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIErpHrmAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIErpHrmAdmin";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { ErpHrmAdminAtSummaryTransformer } from "../transformers/ErpHrmAdminAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchErpHrmAdmins(props: {
  body: IErpHrmAdmin.IRequest;
}): Promise<IPageIErpHrmAdmin.ISummary> {
  const limit = props.body.limit ?? 20;
  const page = props.body.page ?? 1;
  const cursor = props.body.cursor;
  const whereInput: Prisma.erp_hrm_adminsWhereInput = {
    ...(props.body.search && {
      OR: [
        { email: { contains: props.body.search, mode: "insensitive" } },
        { display_name: { contains: props.body.search, mode: "insensitive" } },
      ],
    }),
    ...(props.body.email && {
      email: { contains: props.body.email, mode: "insensitive" },
    }),
    ...(props.body.displayName && {
      display_name: { contains: props.body.displayName, mode: "insensitive" },
    }),
    ...(props.body.phone !== undefined && { phone: props.body.phone }),
    ...(cursor && { id: { lt: cursor } }),
  };
  const skip = cursor ? undefined : (page - 1) * limit;
  const records = await MyGlobal.prisma.erp_hrm_admins.findMany({
    where: whereInput,
    skip: skip,
    take: limit,
    orderBy: { created_at: "desc" },
    ...ErpHrmAdminAtSummaryTransformer.select(),
  });
  const total = await MyGlobal.prisma.erp_hrm_admins.count({
    where: whereInput,
  });
  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
    data: await ArrayUtil.asyncMap(
      records,
      ErpHrmAdminAtSummaryTransformer.transform,
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
// import { IErpHrmAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmAdmin";
// import { IPageIErpHrmAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIErpHrmAdmin";
// import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function patchErpHrmAdmins(props: {
//   body: IErpHrmAdmin.IRequest;
// }): Promise<IPageIErpHrmAdmin.ISummary> {
//   const records = await MyGlobal.prisma.erp_hrm_admins.findMany({
//     ...ErpHrmAdminAtSummaryTransformer.select(),
//     ...,
//   });
//   return {
//     pagination: {
//       current: ...,
//       limit: ...,
//       records: ...,
//       pages: ...,
//     },
//     data: await ArrayUtil.asyncMap(records, ErpHrmAdminAtSummaryTransformer.transform),
//   };
// }
// ```
//--------------------------------------------------------------