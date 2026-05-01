import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallAdmin";
import { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { ShoppingMallAdminAtSummaryTransformer } from "../transformers/ShoppingMallAdminAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchShoppingMallAdminAdmins(props: {
  admin: AdminPayload;
  body: IShoppingMallAdmin.IRequest;
}): Promise<IPageIShoppingMallAdmin.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  const where = {
    ...(props.body.email !== undefined &&
      props.body.email !== "" && {
        email: { contains: props.body.email, mode: "insensitive" as const },
      }),
    ...(props.body.grade !== undefined && { grade: props.body.grade }),
    ...((props.body.createdAt?.from !== undefined ||
      props.body.createdAt?.to !== undefined) && {
      created_at: {
        ...(props.body.createdAt?.from !== undefined && {
          gte: props.body.createdAt.from,
        }),
        ...(props.body.createdAt?.to !== undefined && {
          lte: props.body.createdAt.to,
        }),
      },
    }),
    ...(props.body.includeDeleted !== true && { deleted_at: null }),
  } satisfies Prisma.shopping_mall_adminsWhereInput;
  const data = await MyGlobal.prisma.shopping_mall_admins.findMany({
    where,
    skip,
    take: limit,
    orderBy: { created_at: "desc" },
    ...ShoppingMallAdminAtSummaryTransformer.select(),
  });
  const total = await MyGlobal.prisma.shopping_mall_admins.count({ where });
  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
    data: await ArrayUtil.asyncMap(
      data,
      ShoppingMallAdminAtSummaryTransformer.transform,
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
// import { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
// import { IPageIShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallAdmin";
// import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function patchShoppingMallAdminAdmins(props: {
//   admin: AdminPayload;
//   body: IShoppingMallAdmin.IRequest;
// }): Promise<IPageIShoppingMallAdmin.ISummary> {
//   const records = await MyGlobal.prisma.shopping_mall_admins.findMany({
//     ...ShoppingMallAdminAtSummaryTransformer.select(),
//     ...,
//   });
//   return {
//     pagination: {
//       current: ...,
//       limit: ...,
//       records: ...,
//       pages: ...,
//     },
//     data: await ArrayUtil.asyncMap(records, ShoppingMallAdminAtSummaryTransformer.transform),
//   };
// }
// ```
//--------------------------------------------------------------