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
  const page = props.body.page ?? 1;
  const limit = Math.min(props.body.limit ?? 20, 100);
  const skip = (page - 1) * limit;
  const where: Prisma.ecommerce_mall_super_adminsWhereInput = {
    deleted_at: null,
    ...(props.body.email && {
      email: { contains: props.body.email, mode: "insensitive" as const },
    }),
    ...(props.body.createdAtFrom &&
      props.body.createdAtTo && {
        created_at: {
          gte: new Date(props.body.createdAtFrom),
          lte: new Date(props.body.createdAtTo),
        },
      }),
    ...(props.body.createdAtFrom &&
      !props.body.createdAtTo && {
        created_at: { gte: new Date(props.body.createdAtFrom) },
      }),
    ...(!props.body.createdAtFrom &&
      props.body.createdAtTo && {
        created_at: { lte: new Date(props.body.createdAtTo) },
      }),
  };
  const [data, total] = await Promise.all([
    MyGlobal.prisma.ecommerce_mall_super_admins.findMany({
      where,
      skip,
      take: limit,
      orderBy: { created_at: "desc" as const },
      ...EcommerceMallSuperAdminAtSummaryTransformer.select(),
    }),
    MyGlobal.prisma.ecommerce_mall_super_admins.count({ where }),
  ]);
  return {
    data: await ArrayUtil.asyncMap(
      data,
      EcommerceMallSuperAdminAtSummaryTransformer.transform,
    ),
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
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