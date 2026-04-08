import { IEcommerceMallSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSuperAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIEcommerceMallSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallSuperAdmin";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { SuperadminPayload } from "../decorators/payload/SuperadminPayload";
import { EcommerceMallSuperAdminAtSummaryTransformer } from "../transformers/EcommerceMallSuperAdminAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchEcommerceMallSuperAdminSuperAdmins(props: {
  superAdmin: SuperadminPayload;
  body: IEcommerceMallSuperAdmin.IRequest;
}): Promise<IPageIEcommerceMallSuperAdmin.ISummary> {
  const page = props.body.page ?? (1 as const);
  const limit = props.body.limit ?? (20 as const);
  const skip = (page - 1) * limit;
  const orderByField: "created_at" | "email" =
    props.body.sort === "email" ? "email" : "created_at";
  const orderDirection = props.body.order === "ASC" ? "asc" : "desc";
  const whereInput: Prisma.ecommerce_mall_super_adminsWhereInput = {
    ...(props.body.email !== undefined && {
      email: {
        contains: props.body.email,
        mode: "insensitive",
      },
    }),
    ...(props.body.status === "active"
      ? { deleted_at: null }
      : props.body.status === "deleted"
        ? { deleted_at: { not: null } }
        : {}),
    ...(props.body.createdAtFrom !== undefined && {
      created_at: {
        gte: props.body.createdAtFrom,
      },
    }),
    ...(props.body.createdAtTo !== undefined && {
      created_at: {
        lte: props.body.createdAtTo,
      },
    }),
  };
  const records = await MyGlobal.prisma.ecommerce_mall_super_admins.findMany({
    where: whereInput,
    skip,
    take: limit,
    orderBy: {
      [orderByField]: orderDirection,
    },
    ...EcommerceMallSuperAdminAtSummaryTransformer.select(),
  });
  const total = await MyGlobal.prisma.ecommerce_mall_super_admins.count({
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
      EcommerceMallSuperAdminAtSummaryTransformer.transform,
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
// import { IEcommerceMallSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSuperAdmin";
// import { IPageIEcommerceMallSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallSuperAdmin";
// import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function patchEcommerceMallSuperAdminSuperAdmins(props: {
//   superAdmin: SuperadminPayload;
//   body: IEcommerceMallSuperAdmin.IRequest;
// }): Promise<IPageIEcommerceMallSuperAdmin.ISummary> {
//   const records = await MyGlobal.prisma.ecommerce_mall_super_admins.findMany({
//     ...EcommerceMallSuperAdminAtSummaryTransformer.select(),
//     ...,
//   });
//   return {
//     pagination: {
//       current: ...,
//       limit: ...,
//       records: ...,
//       pages: ...,
//     },
//     data: await ArrayUtil.asyncMap(records, EcommerceMallSuperAdminAtSummaryTransformer.transform),
//   };
// }
// ```
//--------------------------------------------------------------