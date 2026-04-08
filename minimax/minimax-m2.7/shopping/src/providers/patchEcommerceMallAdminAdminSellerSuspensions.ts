import { IEcommerceMall } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMall";
import { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEcommerceMallSellerSuspension } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerSuspension";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIEcommerceMall } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMall";
import { IPageIEcommerceMallSellerSuspension } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallSellerSuspension";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { EcommerceMallSellerSuspensionAtSummaryTransformer } from "../transformers/EcommerceMallSellerSuspensionAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchEcommerceMallAdminAdminSellerSuspensions(props: {
  admin: AdminPayload;
  body: IEcommerceMallSellerSuspension.IRequest;
}): Promise<IPageIEcommerceMallSellerSuspension.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  const whereInput: Prisma.ecommerce_mall_seller_suspensionsWhereInput = {
    ...(props.body.seller_id !== undefined && {
      ecommerce_mall_seller_id: props.body.seller_id,
    }),
    ...(props.body.suspended_by_id !== undefined && {
      suspended_by_id: props.body.suspended_by_id,
    }),
    ...(props.body.restored_by_id !== undefined && {
      restored_by_id: props.body.restored_by_id,
    }),
    ...(props.body.suspended_at_from !== undefined ||
    props.body.suspended_at_to !== undefined
      ? {
          suspended_at: {
            ...(props.body.suspended_at_from !== undefined && {
              gte: new Date(props.body.suspended_at_from),
            }),
            ...(props.body.suspended_at_to !== undefined && {
              lte: new Date(props.body.suspended_at_to),
            }),
          },
        }
      : undefined),
    ...((props.body.restored_at_from !== null &&
      props.body.restored_at_from !== undefined) ||
    (props.body.restored_at_to !== null &&
      props.body.restored_at_to !== undefined)
      ? {
          restored_at: {
            ...(props.body.restored_at_from !== null &&
              props.body.restored_at_from !== undefined && {
                gte: new Date(props.body.restored_at_from),
              }),
            ...(props.body.restored_at_to !== null &&
              props.body.restored_at_to !== undefined && {
                lte: new Date(props.body.restored_at_to),
              }),
          },
        }
      : undefined),
    ...(props.body.status !== undefined && {
      restored_at:
        props.body.status === "active"
          ? { equals: null }
          : props.body.status === "restored"
            ? { not: null }
            : undefined,
    }),
  };
  const records =
    await MyGlobal.prisma.ecommerce_mall_seller_suspensions.findMany({
      where: whereInput,
      skip,
      take: limit,
      orderBy: { suspended_at: "desc" },
      ...EcommerceMallSellerSuspensionAtSummaryTransformer.select(),
    });
  const total = await MyGlobal.prisma.ecommerce_mall_seller_suspensions.count({
    where: whereInput,
  });
  const transformedRecords = await ArrayUtil.asyncMap(
    records,
    EcommerceMallSellerSuspensionAtSummaryTransformer.transform,
  );
  return {
    pagination: {
      pagination: {
        current: page,
        limit: limit,
        records: total,
        pages: Math.ceil(total / limit),
      } satisfies IPage.IPagination,
      data: transformedRecords as IEcommerceMall.IPagination[],
    } satisfies IPageIEcommerceMall.IPagination,
    data: transformedRecords,
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
// import { IEcommerceMallSellerSuspension } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerSuspension";
// import { IPageIEcommerceMallSellerSuspension } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallSellerSuspension";
// import { IPageIEcommerceMall } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMall";
// import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
// import { IEcommerceMall } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMall";
// import { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
// import { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function patchEcommerceMallAdminAdminSellerSuspensions(props: {
//   admin: AdminPayload;
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