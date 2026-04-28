import { IEcommercePlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIEcommercePlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommercePlatformAdmin";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { EcommercePlatformAdminAtSummaryTransformer } from "../transformers/EcommercePlatformAdminAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchEcommercePlatformAdmins(props: {
  body: IEcommercePlatformAdmin.IRequest;
}): Promise<IPageIEcommercePlatformAdmin.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  const whereInput: Prisma.ecommerce_platform_adminsWhereInput = {
    deleted_at: null,
    ...(props.body.isSuper !== undefined && { is_super: props.body.isSuper }),
    ...(props.body.isBanned !== undefined && {
      is_banned: props.body.isBanned,
    }),
  };
  if (
    props.body.createdAtGte !== undefined ||
    props.body.createdAtLte !== undefined
  ) {
    const created_at: Prisma.DateTimeFilter = {};
    if (props.body.createdAtGte !== undefined) {
      created_at.gte = props.body.createdAtGte;
    }
    if (props.body.createdAtLte !== undefined) {
      created_at.lte = props.body.createdAtLte;
    }
    whereInput.created_at = created_at;
  }
  const orderBy: Prisma.ecommerce_platform_adminsOrderByWithRelationInput = {
    created_at: props.body.sort === "created_at" ? "asc" : "desc",
  };
  const records = await MyGlobal.prisma.ecommerce_platform_admins.findMany({
    where: whereInput,
    skip,
    take: limit,
    orderBy,
    ...EcommercePlatformAdminAtSummaryTransformer.select(),
  });
  const total = await MyGlobal.prisma.ecommerce_platform_admins.count({
    where: whereInput,
  });
  return {
    data: await ArrayUtil.asyncMap(
      records,
      EcommercePlatformAdminAtSummaryTransformer.transform,
    ),
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: total > 0 ? Math.ceil(total / limit) : 0,
    } satisfies IPage.IPagination,
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
// import { IEcommercePlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformAdmin";
// import { IPageIEcommercePlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommercePlatformAdmin";
// import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function patchEcommercePlatformAdmins(props: {
//   body: IEcommercePlatformAdmin.IRequest;
// }): Promise<IPageIEcommercePlatformAdmin.ISummary> {
//   const records = await MyGlobal.prisma.ecommerce_platform_admins.findMany({
//     ...EcommercePlatformAdminAtSummaryTransformer.select(),
//     ...,
//   });
//   return {
//     pagination: {
//       current: ...,
//       limit: ...,
//       records: ...,
//       pages: ...,
//     },
//     data: await ArrayUtil.asyncMap(records, EcommercePlatformAdminAtSummaryTransformer.transform),
//   };
// }
// ```
//--------------------------------------------------------------