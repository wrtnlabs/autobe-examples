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

export async function getEcommerceMallAdministratorSellersSellerIdSuspensionHistory(props: {
  administrator: AdministratorPayload;
  sellerId: string & tags.Format<"uuid">;
}): Promise<IPageIEcommerceMallSellerSuspension.ISummary> {
  const page: number = 1;
  const limit: number = 100;
  const skip: number = (page - 1) * limit;
  await MyGlobal.prisma.ecommerce_mall_sellers.findUniqueOrThrow({
    where: { id: props.sellerId },
  });
  const [records, total] = await Promise.all([
    MyGlobal.prisma.ecommerce_mall_seller_suspensions.findMany({
      where: {
        seller_id: props.sellerId,
        deleted_at: null,
      },
      ...EcommerceMallSellerSuspensionAtSummaryTransformer.select(),
      skip,
      take: limit,
      orderBy: { suspended_at: "desc" },
    }),
    MyGlobal.prisma.ecommerce_mall_seller_suspensions.count({
      where: {
        seller_id: props.sellerId,
        deleted_at: null,
      },
    }),
  ]);
  return {
    pagination: {
      current: page,
      limit,
      records: total,
      pages: total === 0 ? 0 : Math.ceil(total / limit),
    } satisfies IPage.IPagination,
    data: await ArrayUtil.asyncMap(
      records,
      EcommerceMallSellerSuspensionAtSummaryTransformer.transform,
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
// import { IPageIEcommerceMallSellerSuspension } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallSellerSuspension";
// import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
// import { IEcommerceMallSellerSuspension } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerSuspension";
// import { IEcommerceMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdministrator";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function getEcommerceMallAdministratorSellersSellerIdSuspensionHistory(props: {
//   administrator: AdministratorPayload;
//   sellerId: string & tags.Format<"uuid">;
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