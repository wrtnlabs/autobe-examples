import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIShoppingMallSellerSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallSellerSession";
import { IShoppingMallSellerSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerSession";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { ShoppingMallSellerSessionAtSummaryTransformer } from "../transformers/ShoppingMallSellerSessionAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchShoppingMallAdminSellersSellerIdSessions(props: {
  admin: AdminPayload;
  sellerId: string & tags.Format<"uuid">;
  body: IShoppingMallSellerSession.IRequest;
}): Promise<IPageIShoppingMallSellerSession.ISummary> {
  await MyGlobal.prisma.shopping_mall_sellers.findFirstOrThrow({
    where: {
      id: props.sellerId,
      deleted_at: null,
    },
  });
  const page: number = props.body.page ?? 1;
  const limit: number = props.body.limit ?? 20;
  const skip: number = (page - 1) * limit;
  const now: string = new Date().toISOString();
  const whereInput: Prisma.shopping_mall_seller_sessionsWhereInput = {
    seller_id: props.sellerId,
  };
  if (props.body.ip !== undefined) {
    whereInput.ip = { contains: props.body.ip, mode: "insensitive" };
  }
  if (
    props.body.created_from !== undefined ||
    props.body.created_to !== undefined
  ) {
    whereInput.created_at = {};
    if (props.body.created_from !== undefined) {
      whereInput.created_at.gte = props.body.created_from;
    }
    if (props.body.created_to !== undefined) {
      whereInput.created_at.lte = props.body.created_to;
    }
  }
  if (props.body.expiration_status === "active") {
    whereInput.expired_at = { gt: now };
  } else if (props.body.expiration_status === "expired") {
    whereInput.expired_at = { lte: now };
  }
  const records = await MyGlobal.prisma.shopping_mall_seller_sessions.findMany({
    ...ShoppingMallSellerSessionAtSummaryTransformer.select(),
    where: whereInput,
    skip,
    take: limit,
    orderBy: {
      created_at: "desc",
    } satisfies Prisma.shopping_mall_seller_sessionsOrderByWithRelationInput,
  });
  const total: number =
    await MyGlobal.prisma.shopping_mall_seller_sessions.count({
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
      ShoppingMallSellerSessionAtSummaryTransformer.transform,
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
// import { IShoppingMallSellerSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerSession";
// import { IPageIShoppingMallSellerSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallSellerSession";
// import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function patchShoppingMallAdminSellersSellerIdSessions(props: {
//   admin: AdminPayload;
//   sellerId: string & tags.Format<"uuid">;
//   body: IShoppingMallSellerSession.IRequest;
// }): Promise<IPageIShoppingMallSellerSession.ISummary> {
//   const records = await MyGlobal.prisma.shopping_mall_seller_sessions.findMany({
//     ...ShoppingMallSellerSessionAtSummaryTransformer.select(),
//     ...,
//   });
//   return {
//     pagination: {
//       current: ...,
//       limit: ...,
//       records: ...,
//       pages: ...,
//     },
//     data: await ArrayUtil.asyncMap(records, ShoppingMallSellerSessionAtSummaryTransformer.transform),
//   };
// }
// ```
//--------------------------------------------------------------