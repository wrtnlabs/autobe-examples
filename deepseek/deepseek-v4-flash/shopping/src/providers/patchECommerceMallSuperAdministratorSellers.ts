import { IECommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallSeller";
import { IECommerceMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallSellerProfile";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIECommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIECommerceMallSeller";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { SuperadministratorPayload } from "../decorators/payload/SuperadministratorPayload";
import { ECommerceMallSellerAtSummaryTransformer } from "../transformers/ECommerceMallSellerAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchECommerceMallSuperAdministratorSellers(props: {
  superAdministrator: SuperadministratorPayload;
  body: IECommerceMallSeller.IRequest;
}): Promise<IPageIECommerceMallSeller.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  const whereInput = {
    deleted_at: null,
    ...(props.body.approval_status && {
      approval_status: props.body.approval_status,
    }),
    ...((props.body.created_at_from || props.body.created_at_to) && {
      created_at: {
        ...(props.body.created_at_from && { gte: props.body.created_at_from }),
        ...(props.body.created_at_to && { lte: props.body.created_at_to }),
      },
    }),
    ...((props.body.email || props.body.search) && {
      AND: [
        ...(props.body.email
          ? [{ email: { contains: props.body.email } }]
          : []),
        ...(props.body.search
          ? [{ email: { contains: props.body.search } }]
          : []),
      ],
    }),
  } satisfies Prisma.e_commerce_mall_sellersWhereInput;
  const orderByInput: Prisma.e_commerce_mall_sellersOrderByWithRelationInput =
    props.body.sort_field === "created_at"
      ? { created_at: props.body.sort_direction ?? "desc" }
      : props.body.sort_field === "email"
        ? { email: props.body.sort_direction ?? "desc" }
        : props.body.sort_field === "approval_status"
          ? { approval_status: props.body.sort_direction ?? "desc" }
          : { created_at: "desc" };
  const records = await MyGlobal.prisma.e_commerce_mall_sellers.findMany({
    where: whereInput,
    skip,
    take: limit,
    orderBy: orderByInput,
    ...ECommerceMallSellerAtSummaryTransformer.select(),
  });
  const total = await MyGlobal.prisma.e_commerce_mall_sellers.count({
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
      ECommerceMallSellerAtSummaryTransformer.transform,
    ),
  } satisfies IPageIECommerceMallSeller.ISummary;
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
// import { IECommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallSeller";
// import { IPageIECommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIECommerceMallSeller";
// import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
// import { IECommerceMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallSellerProfile";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function patchECommerceMallSuperAdministratorSellers(props: {
//   superAdministrator: SuperadministratorPayload;
//   body: IECommerceMallSeller.IRequest;
// }): Promise<IPageIECommerceMallSeller.ISummary> {
//   const records = await MyGlobal.prisma.e_commerce_mall_sellers.findMany({
//     ...ECommerceMallSellerAtSummaryTransformer.select(),
//     ...,
//   });
//   return {
//     pagination: {
//       current: ...,
//       limit: ...,
//       records: ...,
//       pages: ...,
//     },
//     data: await ArrayUtil.asyncMap(records, ECommerceMallSellerAtSummaryTransformer.transform),
//   };
// }
// ```
//--------------------------------------------------------------