import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIShoppingMallCustomerSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallCustomerSession";
import { IShoppingMallCustomerSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerSession";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { ShoppingMallCustomerSessionAtSummaryTransformer } from "../transformers/ShoppingMallCustomerSessionAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchShoppingMallAdminCustomersCustomerIdSessions(props: {
  admin: AdminPayload;
  customerId: string & tags.Format<"uuid">;
  body: IShoppingMallCustomerSession.IRequest;
}): Promise<IPageIShoppingMallCustomerSession.ISummary> {
  const page: number = props.body.page ?? 1;
  const limit: number = props.body.limit ?? 20;
  const skip: number = (page - 1) * limit;
  const conditions: Prisma.shopping_mall_customer_sessionsWhereInput[] = [
    { shopping_mall_customer_id: props.customerId },
  ];
  if (props.body.ip !== undefined) {
    conditions.push({ ip: { contains: props.body.ip } });
  }
  if (props.body.created_at_from !== undefined) {
    conditions.push({ created_at: { gte: props.body.created_at_from } });
  }
  if (props.body.created_at_to !== undefined) {
    conditions.push({ created_at: { lte: props.body.created_at_to } });
  }
  if (props.body.active !== undefined) {
    const now: string = new Date().toISOString();
    if (props.body.active) {
      conditions.push({ expired_at: { gt: now } });
    } else {
      conditions.push({ expired_at: { lte: now } });
    }
  }
  if (props.body.expired_at_from !== undefined) {
    conditions.push({ expired_at: { gte: props.body.expired_at_from } });
  }
  if (props.body.expired_at_to !== undefined) {
    conditions.push({ expired_at: { lte: props.body.expired_at_to } });
  }
  const whereInput: Prisma.shopping_mall_customer_sessionsWhereInput = {
    AND: conditions,
  } satisfies Prisma.shopping_mall_customer_sessionsWhereInput;
  const records =
    await MyGlobal.prisma.shopping_mall_customer_sessions.findMany({
      where: whereInput,
      skip,
      take: limit,
      orderBy: { created_at: "desc" },
      ...ShoppingMallCustomerSessionAtSummaryTransformer.select(),
    });
  const total: number =
    await MyGlobal.prisma.shopping_mall_customer_sessions.count({
      where: whereInput,
    });
  return {
    pagination: {
      current: page,
      limit,
      records: total,
      pages: total === 0 ? 0 : Math.ceil(total / limit),
    } satisfies IPage.IPagination,
    data: await ArrayUtil.asyncMap(
      records,
      ShoppingMallCustomerSessionAtSummaryTransformer.transform,
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
// import { IShoppingMallCustomerSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerSession";
// import { IPageIShoppingMallCustomerSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallCustomerSession";
// import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function patchShoppingMallAdminCustomersCustomerIdSessions(props: {
//   admin: AdminPayload;
//   customerId: string & tags.Format<"uuid">;
//   body: IShoppingMallCustomerSession.IRequest;
// }): Promise<IPageIShoppingMallCustomerSession.ISummary> {
//   const records = await MyGlobal.prisma.shopping_mall_customer_sessions.findMany({
//     ...ShoppingMallCustomerSessionAtSummaryTransformer.select(),
//     ...,
//   });
//   return {
//     pagination: {
//       current: ...,
//       limit: ...,
//       records: ...,
//       pages: ...,
//     },
//     data: await ArrayUtil.asyncMap(records, ShoppingMallCustomerSessionAtSummaryTransformer.transform),
//   };
// }
// ```
//--------------------------------------------------------------