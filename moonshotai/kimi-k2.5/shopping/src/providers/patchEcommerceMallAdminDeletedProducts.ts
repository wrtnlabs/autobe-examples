import { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallProduct";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { EcommerceMallProductAtSummaryTransformer } from "../transformers/EcommerceMallProductAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchEcommerceMallAdminDeletedProducts(props: {
  admin: AdminPayload;
  body: IEcommerceMallProduct.IDeletedRequest;
}): Promise<IPageIEcommerceMallProduct.ISummary> {
  const page: number = props.body.page ?? 1;
  const limit: number = props.body.limit ?? 20;
  const skip: number = (page - 1) * limit;
  const sortParam: string = props.body.sort ?? "deleted_at:DESC";
  const [sortField, sortDirection] = sortParam.split(":");
  const direction: "asc" | "desc" =
    sortDirection?.toLowerCase() === "asc" ? "asc" : "desc";
  const orderBy: Prisma.ecommerce_mall_productsOrderByWithRelationInput =
    sortField === "name"
      ? { name: direction }
      : sortField === "created_at"
        ? { created_at: direction }
        : { deleted_at: direction };
  const deletedAtFilter: Prisma.DateTimeNullableFilter = { not: null };
  if (props.body.deleted_at_from !== undefined) {
    deletedAtFilter.gte = props.body.deleted_at_from;
  }
  if (props.body.deleted_at_to !== undefined) {
    deletedAtFilter.lte = props.body.deleted_at_to;
  }
  const where: Prisma.ecommerce_mall_productsWhereInput = {
    deleted_at: deletedAtFilter,
    ...(props.body.name !== undefined && {
      name: { contains: props.body.name, mode: "insensitive" },
    }),
    ...(props.body.seller_id !== undefined && {
      seller_id: props.body.seller_id,
    }),
    ...(props.body.category_id !== undefined && {
      category_id: props.body.category_id,
    }),
  };
  const records = await MyGlobal.prisma.ecommerce_mall_products.findMany({
    where,
    skip,
    take: limit,
    orderBy,
    ...EcommerceMallProductAtSummaryTransformer.select(),
  });
  const total: number = await MyGlobal.prisma.ecommerce_mall_products.count({
    where,
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
      EcommerceMallProductAtSummaryTransformer.transform,
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
// import { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
// import { IPageIEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallProduct";
// import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
// import { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
// import { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function patchEcommerceMallAdminDeletedProducts(props: {
//   admin: AdminPayload;
//   body: IEcommerceMallProduct.IDeletedRequest;
// }): Promise<IPageIEcommerceMallProduct.ISummary> {
//   const records = await MyGlobal.prisma.ecommerce_mall_products.findMany({
//     ...EcommerceMallProductAtSummaryTransformer.select(),
//     ...,
//   });
//   return {
//     pagination: {
//       current: ...,
//       limit: ...,
//       records: ...,
//       pages: ...,
//     },
//     data: await ArrayUtil.asyncMap(records, EcommerceMallProductAtSummaryTransformer.transform),
//   };
// }
// ```
//--------------------------------------------------------------