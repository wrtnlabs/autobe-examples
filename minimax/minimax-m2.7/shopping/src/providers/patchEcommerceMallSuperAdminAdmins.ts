import { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallAdmin";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { SuperadminPayload } from "../decorators/payload/SuperadminPayload";
import { EcommerceMallAdminAtSummaryTransformer } from "../transformers/EcommerceMallAdminAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchEcommerceMallSuperAdminAdmins(props: {
  superAdmin: SuperadminPayload;
  body: IEcommerceMallAdmin.IRequest;
}): Promise<IPageIEcommerceMallAdmin.ISummary> {
  const page = props.body.page ?? (1 as const);
  const limit = props.body.limit ?? (20 as const);
  const skip = (page - 1) * limit;
  const whereInput = {
    deleted_at: props.body.status === "deleted" ? { not: null } : null,
    ...(props.body.email !== undefined && {
      email: { contains: props.body.email, mode: "insensitive" as const },
    }),
    ...(props.body.name !== undefined && {
      name: { contains: props.body.name, mode: "insensitive" as const },
    }),
    ...(props.body.createdAfter !== undefined && {
      created_at: { gte: new Date(props.body.createdAfter as string) },
    }),
    ...(props.body.createdBefore !== undefined && {
      created_at: { lte: new Date(props.body.createdBefore as string) },
    }),
  } satisfies Prisma.ecommerce_mall_adminsWhereInput;
  const orderByInput = (
    props.body.sortBy === "email"
      ? { email: props.body.sort ?? "desc" }
      : props.body.sortBy === "name"
        ? { name: props.body.sort ?? "desc" }
        : { created_at: props.body.sort ?? "desc" }
  ) satisfies Prisma.ecommerce_mall_adminsOrderByWithRelationInput;
  const records = await MyGlobal.prisma.ecommerce_mall_admins.findMany({
    where: whereInput,
    orderBy: orderByInput,
    skip,
    take: limit,
    ...EcommerceMallAdminAtSummaryTransformer.select(),
  });
  const total = await MyGlobal.prisma.ecommerce_mall_admins.count({
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
      EcommerceMallAdminAtSummaryTransformer.transform,
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
// import { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
// import { IPageIEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallAdmin";
// import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function patchEcommerceMallSuperAdminAdmins(props: {
//   superAdmin: SuperadminPayload;
//   body: IEcommerceMallAdmin.IRequest;
// }): Promise<IPageIEcommerceMallAdmin.ISummary> {
//   const records = await MyGlobal.prisma.ecommerce_mall_admins.findMany({
//     ...EcommerceMallAdminAtSummaryTransformer.select(),
//     ...,
//   });
//   return {
//     pagination: {
//       current: ...,
//       limit: ...,
//       records: ...,
//       pages: ...,
//     },
//     data: await ArrayUtil.asyncMap(records, EcommerceMallAdminAtSummaryTransformer.transform),
//   };
// }
// ```
//--------------------------------------------------------------