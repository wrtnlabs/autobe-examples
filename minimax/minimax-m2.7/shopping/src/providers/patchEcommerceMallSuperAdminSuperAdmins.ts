import { IEcommerceMall } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMall";
import { IEcommerceMallSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSuperAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIEcommerceMall } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMall";
import { IPageIEcommerceMallSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallSuperAdmin";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { SuperadminPayload } from "../decorators/payload/SuperadminPayload";
import { EcommerceMallSuperAdminTransformer } from "../transformers/EcommerceMallSuperAdminTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchEcommerceMallSuperAdminSuperAdmins(props: {
  superAdmin: SuperadminPayload;
  body: IEcommerceMallSuperAdmin.IRequest;
}): Promise<IPageIEcommerceMallSuperAdmin> {
  const page = typia.assert<number & tags.Type<"int32"> & tags.Minimum<1>>(
    props.body.page ?? 1,
  );
  const limit = typia.assert<
    number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<100>
  >(props.body.limit ?? 20);
  const skip = (page - 1) * limit;
  const whereInput: Prisma.ecommerce_mall_super_adminsWhereInput = {
    ...(props.body.search && {
      email: {
        contains: props.body.search,
        mode: "insensitive",
      },
    }),
    ...(props.body.createdAtFrom &&
      props.body.createdAtTo && {
        created_at: {
          gte: props.body.createdAtFrom,
          lte: props.body.createdAtTo,
        },
      }),
    ...(!props.body.createdAtFrom &&
      props.body.createdAtTo && {
        created_at: {
          lte: props.body.createdAtTo,
        },
      }),
    ...(props.body.createdAtFrom &&
      !props.body.createdAtTo && {
        created_at: {
          gte: props.body.createdAtFrom,
        },
      }),
    ...(props.body.includeDeleted ? {} : { deleted_at: null }),
  };
  const orderByInput: Prisma.ecommerce_mall_super_adminsOrderByWithRelationInput =
    props.body.sort === "created_at"
      ? { created_at: "asc" }
      : { created_at: "desc" };
  const data = await MyGlobal.prisma.ecommerce_mall_super_admins.findMany({
    where: whereInput,
    skip,
    take: limit,
    orderBy: orderByInput,
    ...EcommerceMallSuperAdminTransformer.select(),
  });
  const total = await MyGlobal.prisma.ecommerce_mall_super_admins.count({
    where: whereInput,
  });
  return {
    pagination: typia.assert<IPageIEcommerceMall.IPagination>({
      pagination: {
        current: page,
        limit: limit,
        records: total,
        pages: Math.ceil(total / limit),
      },
      data: [],
    }),
    data: await ArrayUtil.asyncMap(
      data,
      EcommerceMallSuperAdminTransformer.transform,
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
// import { IPageIEcommerceMall } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMall";
// import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
// import { IEcommerceMall } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMall";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function patchEcommerceMallSuperAdminSuperAdmins(props: {
//   superAdmin: SuperadminPayload;
//   body: IEcommerceMallSuperAdmin.IRequest;
// }): Promise<IPageIEcommerceMallSuperAdmin> {
//   const records = await MyGlobal.prisma.ecommerce_mall_super_admins.findMany({
//     ...EcommerceMallSuperAdminTransformer.select(),
//     ...,
//   });
//   return {
//     pagination: {
//       current: ...,
//       limit: ...,
//       records: ...,
//       pages: ...,
//     },
//     data: await ArrayUtil.asyncMap(records, EcommerceMallSuperAdminTransformer.transform),
//   };
// }
// ```
//--------------------------------------------------------------