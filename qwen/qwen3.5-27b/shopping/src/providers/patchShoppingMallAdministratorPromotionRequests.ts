import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIShoppingMallAdministratorPromotionRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallAdministratorPromotionRequest";
import { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import { IShoppingMallAdministratorPromotionRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministratorPromotionRequest";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdministratorPayload } from "../decorators/payload/AdministratorPayload";
import { ShoppingMallAdministratorPromotionRequestAtSummaryTransformer } from "../transformers/ShoppingMallAdministratorPromotionRequestAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchShoppingMallAdministratorPromotionRequests(props: {
  administrator: AdministratorPayload;
  body: IShoppingMallAdministratorPromotionRequest.IRequest;
}): Promise<IPageIShoppingMallAdministratorPromotionRequest.ISummary> {
  const administrator =
    await MyGlobal.prisma.shopping_mall_administrators.findUniqueOrThrow({
      where: { id: props.administrator.id },
      select: { id: true, grade: true },
    });
  if (administrator.grade !== "super") {
    throw new HttpException("Forbidden", 403);
  }
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  const whereInput = {
    deleted_at: null,
    ...(props.body.status && { status: props.body.status }),
    ...(props.body.actor_type && { actor_type: props.body.actor_type }),
    ...(props.body.search && {
      reason: {
        contains: props.body.search,
        mode: "insensitive" as const,
      },
    }),
  } satisfies Prisma.shopping_mall_administrator_promotion_requestsWhereInput;
  const sortField = props.body.sort ?? "created_at";
  const sortOrder = props.body.order ?? "desc";
  const orderByInput = {
    [sortField]: sortOrder,
  } satisfies Prisma.shopping_mall_administrator_promotion_requestsOrderByWithRelationInput;
  const [records, total] = await Promise.all([
    MyGlobal.prisma.shopping_mall_administrator_promotion_requests.findMany({
      where: whereInput,
      skip,
      take: limit,
      orderBy: orderByInput,
      ...ShoppingMallAdministratorPromotionRequestAtSummaryTransformer.select(),
    }),
    MyGlobal.prisma.shopping_mall_administrator_promotion_requests.count({
      where: whereInput,
    }),
  ]);
  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
    data: await ArrayUtil.asyncMap(
      records,
      ShoppingMallAdministratorPromotionRequestAtSummaryTransformer.transform,
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
// import { IShoppingMallAdministratorPromotionRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministratorPromotionRequest";
// import { IPageIShoppingMallAdministratorPromotionRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallAdministratorPromotionRequest";
// import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
// import { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function patchShoppingMallAdministratorPromotionRequests(props: {
//   administrator: AdministratorPayload;
//   body: IShoppingMallAdministratorPromotionRequest.IRequest;
// }): Promise<IPageIShoppingMallAdministratorPromotionRequest.ISummary> {
//   const records = await MyGlobal.prisma.shopping_mall_administrator_promotion_requests.findMany({
//     ...ShoppingMallAdministratorPromotionRequestAtSummaryTransformer.select(),
//     ...,
//   });
//   return {
//     pagination: {
//       current: ...,
//       limit: ...,
//       records: ...,
//       pages: ...,
//     },
//     data: await ArrayUtil.asyncMap(records, ShoppingMallAdministratorPromotionRequestAtSummaryTransformer.transform),
//   };
// }
// ```
//--------------------------------------------------------------