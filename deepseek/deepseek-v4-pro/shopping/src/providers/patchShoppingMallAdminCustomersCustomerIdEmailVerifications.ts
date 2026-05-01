import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIShoppingMallCustomerEmailVerification } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallCustomerEmailVerification";
import { IShoppingMallCustomerEmailVerification } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerEmailVerification";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { ShoppingMallCustomerEmailVerificationAtSummaryTransformer } from "../transformers/ShoppingMallCustomerEmailVerificationAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchShoppingMallAdminCustomersCustomerIdEmailVerifications(props: {
  admin: AdminPayload;
  customerId: string & tags.Format<"uuid">;
  body: IShoppingMallCustomerEmailVerification.IRequest;
}): Promise<IPageIShoppingMallCustomerEmailVerification.ISummary> {
  await MyGlobal.prisma.shopping_mall_customers.findUniqueOrThrow({
    where: { id: props.customerId },
    select: { id: true },
  });
  const page: number = props.body.page ?? 1;
  const limit: number = props.body.limit ?? 20;
  const skip: number = (page - 1) * limit;
  const hasDateRange: boolean =
    props.body.from !== undefined || props.body.to !== undefined;
  const whereInput = {
    shopping_mall_customer_id: props.customerId,
    ...(hasDateRange
      ? {
          created_at: {
            ...(props.body.from !== undefined ? { gte: props.body.from } : {}),
            ...(props.body.to !== undefined ? { lte: props.body.to } : {}),
          },
        }
      : {}),
    ...(props.body.expiration === "active"
      ? { expired_at: { gt: new Date() } }
      : {}),
    ...(props.body.expiration === "expired"
      ? { expired_at: { lte: new Date() } }
      : {}),
  } satisfies Prisma.shopping_mall_customer_email_verificationsWhereInput;
  const orderByInput =
    props.body.sort === "asc"
      ? ({
          created_at: "asc",
        } satisfies Prisma.shopping_mall_customer_email_verificationsOrderByWithRelationInput)
      : ({
          created_at: "desc",
        } satisfies Prisma.shopping_mall_customer_email_verificationsOrderByWithRelationInput);
  const data =
    await MyGlobal.prisma.shopping_mall_customer_email_verifications.findMany({
      where: whereInput,
      skip,
      take: limit,
      orderBy: orderByInput,
      ...ShoppingMallCustomerEmailVerificationAtSummaryTransformer.select(),
    });
  const total: number =
    await MyGlobal.prisma.shopping_mall_customer_email_verifications.count({
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
      ShoppingMallCustomerEmailVerificationAtSummaryTransformer.transform,
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
// import { IShoppingMallCustomerEmailVerification } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerEmailVerification";
// import { IPageIShoppingMallCustomerEmailVerification } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallCustomerEmailVerification";
// import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function patchShoppingMallAdminCustomersCustomerIdEmailVerifications(props: {
//   admin: AdminPayload;
//   customerId: string & tags.Format<"uuid">;
//   body: IShoppingMallCustomerEmailVerification.IRequest;
// }): Promise<IPageIShoppingMallCustomerEmailVerification.ISummary> {
//   const records = await MyGlobal.prisma.shopping_mall_customer_email_verifications.findMany({
//     ...ShoppingMallCustomerEmailVerificationAtSummaryTransformer.select(),
//     ...,
//   });
//   return {
//     pagination: {
//       current: ...,
//       limit: ...,
//       records: ...,
//       pages: ...,
//     },
//     data: await ArrayUtil.asyncMap(records, ShoppingMallCustomerEmailVerificationAtSummaryTransformer.transform),
//   };
// }
// ```
//--------------------------------------------------------------