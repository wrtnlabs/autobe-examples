import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IMallPlatformSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSeller";
import { IMallPlatformSellerPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSellerPasswordReset";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIMallPlatformSellerPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIMallPlatformSellerPasswordReset";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";
import { MallPlatformSellerPasswordResetAtSummaryTransformer } from "../transformers/MallPlatformSellerPasswordResetAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchMallPlatformCustomerPasswordResets(props: {
  customer: CustomerPayload;
  body: IMallPlatformSellerPasswordReset.IRequest;
}): Promise<IPageIMallPlatformSellerPasswordReset.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  const where = {
    deleted_at: null,
    ...(props.body.accountId !== null
      ? { seller_account_id: props.body.accountId }
      : {}),
  } satisfies Prisma.mall_platform_seller_password_resetsWhereInput;
  const records =
    await MyGlobal.prisma.mall_platform_seller_password_resets.findMany({
      where,
      orderBy: { created_at: "desc" },
      skip,
      take: limit,
      ...MallPlatformSellerPasswordResetAtSummaryTransformer.select(),
    });
  const total =
    await MyGlobal.prisma.mall_platform_seller_password_resets.count({
      where,
    });
  return {
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
    data: await ArrayUtil.asyncMap(
      records,
      MallPlatformSellerPasswordResetAtSummaryTransformer.transform,
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
// import { IMallPlatformSellerPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSellerPasswordReset";
// import { IPageIMallPlatformSellerPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIMallPlatformSellerPasswordReset";
// import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
// import { IMallPlatformSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSeller";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function patchMallPlatformCustomerPasswordResets(props: {
//   customer: CustomerPayload;
//   body: IMallPlatformSellerPasswordReset.IRequest;
// }): Promise<IPageIMallPlatformSellerPasswordReset.ISummary> {
//   const records = await MyGlobal.prisma.mall_platform_seller_password_resets.findMany({
//     ...MallPlatformSellerPasswordResetAtSummaryTransformer.select(),
//     ...,
//   });
//   return {
//     pagination: {
//       current: ...,
//       limit: ...,
//       records: ...,
//       pages: ...,
//     },
//     data: await ArrayUtil.asyncMap(records, MallPlatformSellerPasswordResetAtSummaryTransformer.transform),
//   };
// }
// ```
//--------------------------------------------------------------