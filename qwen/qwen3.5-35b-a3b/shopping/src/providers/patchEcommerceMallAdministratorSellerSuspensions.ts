import { IEcommerceMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdministrator";
import { IEcommerceMallSellerSuspension } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerSuspension";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIEcommerceMallSellerSuspension } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallSellerSuspension";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdministratorPayload } from "../decorators/payload/AdministratorPayload";
import { EcommerceMallSellerSuspensionAtSummaryTransformer } from "../transformers/EcommerceMallSellerSuspensionAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchEcommerceMallAdministratorSellerSuspensions(props: {
  administrator: AdministratorPayload;
  body: IEcommerceMallSellerSuspension.IRequest;
}): Promise<IPageIEcommerceMallSellerSuspension.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  const whereInput: Prisma.ecommerce_mall_seller_suspensionsWhereInput = {
    deleted_at: null,
    ...(props.body.seller_id && { seller_id: props.body.seller_id }),
    ...(props.body.suspended_by_admin_id && {
      suspended_by_admin_id: props.body.suspended_by_admin_id,
    }),
    ...(props.body.suspended_at_from && {
      suspended_at: { gte: new Date(props.body.suspended_at_from) },
    }),
    ...(props.body.suspended_at_to && {
      suspended_at: { lte: new Date(props.body.suspended_at_to) },
    }),
    ...(props.body.resolved_at_status === "active" && { resolved_at: null }),
    ...(props.body.resolved_at_status === "resolved" && {
      resolved_at: { not: null },
    }),
    ...(props.body.reason && {
      reason: { contains: props.body.reason, mode: "insensitive" },
    }),
  } satisfies Prisma.ecommerce_mall_seller_suspensionsWhereInput;
  const validSortFields: readonly string[] = [
    "id",
    "seller_id",
    "suspended_by_admin_id",
    "suspended_at",
    "resolved_at",
    "reason",
    "created_at",
    "updated_at",
    "deleted_at",
  ];
  const orderByInput = () => {
    if (props.body.sort_by && validSortFields.includes(props.body.sort_by)) {
      return {
        [props.body.sort_by]: props.body.sort_order ?? "desc",
      } as Prisma.ecommerce_mall_seller_suspensionsOrderByWithRelationInput;
    }
    return {
      suspended_at: "desc",
    } as Prisma.ecommerce_mall_seller_suspensionsOrderByWithRelationInput;
  };
  const [records, total] = await Promise.all([
    MyGlobal.prisma.ecommerce_mall_seller_suspensions.findMany({
      where: whereInput,
      orderBy: orderByInput(),
      skip,
      take: limit,
      ...EcommerceMallSellerSuspensionAtSummaryTransformer.select(),
    }),
    MyGlobal.prisma.ecommerce_mall_seller_suspensions.count({
      where: whereInput,
    }),
  ]);
  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
    data: await ArrayUtil.asyncMap(
      records,
      EcommerceMallSellerSuspensionAtSummaryTransformer.transform,
    ),
  } satisfies IPageIEcommerceMallSellerSuspension.ISummary;
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
// import { IEcommerceMallSellerSuspension } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerSuspension";
// import { IPageIEcommerceMallSellerSuspension } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallSellerSuspension";
// import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
// import { IEcommerceMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdministrator";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function patchEcommerceMallAdministratorSellerSuspensions(props: {
//   administrator: AdministratorPayload;
//   body: IEcommerceMallSellerSuspension.IRequest;
// }): Promise<IPageIEcommerceMallSellerSuspension.ISummary> {
//   const records = await MyGlobal.prisma.ecommerce_mall_seller_suspensions.findMany({
//     ...EcommerceMallSellerSuspensionAtSummaryTransformer.select(),
//     ...,
//   });
//   return {
//     pagination: {
//       current: ...,
//       limit: ...,
//       records: ...,
//       pages: ...,
//     },
//     data: await ArrayUtil.asyncMap(records, EcommerceMallSellerSuspensionAtSummaryTransformer.transform),
//   };
// }
// ```
//--------------------------------------------------------------