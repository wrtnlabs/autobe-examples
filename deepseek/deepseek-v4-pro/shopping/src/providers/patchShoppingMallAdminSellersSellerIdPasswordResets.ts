import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIShoppingMallSellerPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallSellerPasswordReset";
import { IShoppingMallSellerPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerPasswordReset";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { ShoppingMallSellerPasswordResetAtSummaryTransformer } from "../transformers/ShoppingMallSellerPasswordResetAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchShoppingMallAdminSellersSellerIdPasswordResets(props: {
  admin: AdminPayload;
  sellerId: string & tags.Format<"uuid">;
  body: IShoppingMallSellerPasswordReset.IRequest;
}): Promise<IPageIShoppingMallSellerPasswordReset.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  const whereInput = {
    shopping_mall_seller_id: props.sellerId,
    ...(props.body.from !== undefined &&
      props.body.to !== undefined && {
        created_at: {
          gte: props.body.from,
          lte: props.body.to,
        },
      }),
    ...(props.body.expiry === "active" && {
      expired_at: { gt: new Date().toISOString() },
    }),
    ...(props.body.expiry === "expired" && {
      expired_at: { lte: new Date().toISOString() },
    }),
  } satisfies Prisma.shopping_mall_seller_password_resetsWhereInput;
  const records =
    await MyGlobal.prisma.shopping_mall_seller_password_resets.findMany({
      where: whereInput,
      skip,
      take: limit,
      orderBy: { created_at: "desc" },
      ...ShoppingMallSellerPasswordResetAtSummaryTransformer.select(),
    });
  const total =
    await MyGlobal.prisma.shopping_mall_seller_password_resets.count({
      where: whereInput,
    });
  return {
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
    data: await ArrayUtil.asyncMap(
      records,
      ShoppingMallSellerPasswordResetAtSummaryTransformer.transform,
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
// import { IShoppingMallSellerPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerPasswordReset";
// import { IPageIShoppingMallSellerPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallSellerPasswordReset";
// import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function patchShoppingMallAdminSellersSellerIdPasswordResets(props: {
//   admin: AdminPayload;
//   sellerId: string & tags.Format<"uuid">;
//   body: IShoppingMallSellerPasswordReset.IRequest;
// }): Promise<IPageIShoppingMallSellerPasswordReset.ISummary> {
//   const records = await MyGlobal.prisma.shopping_mall_seller_password_resets.findMany({
//     ...ShoppingMallSellerPasswordResetAtSummaryTransformer.select(),
//     ...,
//   });
//   return {
//     pagination: {
//       current: ...,
//       limit: ...,
//       records: ...,
//       pages: ...,
//     },
//     data: await ArrayUtil.asyncMap(records, ShoppingMallSellerPasswordResetAtSummaryTransformer.transform),
//   };
// }
// ```
//--------------------------------------------------------------