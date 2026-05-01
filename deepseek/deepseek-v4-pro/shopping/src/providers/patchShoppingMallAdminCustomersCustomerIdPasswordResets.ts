import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIShoppingMallCustomerPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallCustomerPasswordReset";
import { IShoppingMallCustomerPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerPasswordReset";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { ShoppingMallCustomerPasswordResetAtSummaryTransformer } from "../transformers/ShoppingMallCustomerPasswordResetAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchShoppingMallAdminCustomersCustomerIdPasswordResets(props: {
  admin: AdminPayload;
  customerId: string & tags.Format<"uuid">;
  body: IShoppingMallCustomerPasswordReset.IRequest;
}): Promise<IPageIShoppingMallCustomerPasswordReset.ISummary> {
  await MyGlobal.prisma.shopping_mall_customers.findUniqueOrThrow({
    where: { id: props.customerId },
  });
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  const now = new Date();
  const whereInput = {
    shopping_mall_customer_id: props.customerId,
    ...(props.body.token_status === "valid"
      ? { expired_at: { gt: now } }
      : props.body.token_status === "expired"
        ? { expired_at: { lte: now } }
        : {}),
    ...(props.body.created_at_start !== undefined ||
    props.body.created_at_end !== undefined
      ? {
          created_at: {
            ...(props.body.created_at_start !== undefined && {
              gte: new Date(props.body.created_at_start),
            }),
            ...(props.body.created_at_end !== undefined && {
              lte: new Date(props.body.created_at_end),
            }),
          },
        }
      : {}),
  } satisfies Prisma.shopping_mall_customer_password_resetsWhereInput;
  const data =
    await MyGlobal.prisma.shopping_mall_customer_password_resets.findMany({
      where: whereInput,
      skip,
      take: limit,
      orderBy: { created_at: "desc" },
      ...ShoppingMallCustomerPasswordResetAtSummaryTransformer.select(),
    });
  const total =
    await MyGlobal.prisma.shopping_mall_customer_password_resets.count({
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
      data,
      ShoppingMallCustomerPasswordResetAtSummaryTransformer.transform,
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
// import { IShoppingMallCustomerPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerPasswordReset";
// import { IPageIShoppingMallCustomerPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallCustomerPasswordReset";
// import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function patchShoppingMallAdminCustomersCustomerIdPasswordResets(props: {
//   admin: AdminPayload;
//   customerId: string & tags.Format<"uuid">;
//   body: IShoppingMallCustomerPasswordReset.IRequest;
// }): Promise<IPageIShoppingMallCustomerPasswordReset.ISummary> {
//   const records = await MyGlobal.prisma.shopping_mall_customer_password_resets.findMany({
//     ...ShoppingMallCustomerPasswordResetAtSummaryTransformer.select(),
//     ...,
//   });
//   return {
//     pagination: {
//       current: ...,
//       limit: ...,
//       records: ...,
//       pages: ...,
//     },
//     data: await ArrayUtil.asyncMap(records, ShoppingMallCustomerPasswordResetAtSummaryTransformer.transform),
//   };
// }
// ```
//--------------------------------------------------------------