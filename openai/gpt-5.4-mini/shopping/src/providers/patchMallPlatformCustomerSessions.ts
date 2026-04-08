import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IMallPlatformCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCustomer";
import { IMallPlatformCustomerSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCustomerSession";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIMallPlatformCustomerSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIMallPlatformCustomerSession";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";
import { MallPlatformCustomerSessionAtSummaryTransformer } from "../transformers/MallPlatformCustomerSessionAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchMallPlatformCustomerSessions(props: {
  customer: CustomerPayload;
  body: IMallPlatformCustomerSession.IRequest;
}): Promise<IPageIMallPlatformCustomerSession.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  const where: Prisma.mall_platform_customer_sessionsWhereInput = {
    mall_platform_customer_id: props.customer.id,
    ...(props.body.ip !== undefined ? { ip: props.body.ip } : {}),
    ...(props.body.href !== undefined ? { href: props.body.href } : {}),
    ...(props.body.referrer !== undefined
      ? { referrer: props.body.referrer }
      : {}),
    ...(props.body.search !== undefined
      ? {
          OR: [
            { ip: { contains: props.body.search, mode: "insensitive" } },
            { href: { contains: props.body.search, mode: "insensitive" } },
            { referrer: { contains: props.body.search, mode: "insensitive" } },
          ],
        }
      : {}),
    ...(props.body.createdAtFrom !== undefined ||
    props.body.createdAtTo !== undefined
      ? {
          created_at: {
            ...(props.body.createdAtFrom !== undefined
              ? { gte: new globalThis.Date(props.body.createdAtFrom) }
              : {}),
            ...(props.body.createdAtTo !== undefined
              ? { lte: new globalThis.Date(props.body.createdAtTo) }
              : {}),
          },
        }
      : {}),
    ...(props.body.expiredAtFrom !== undefined ||
    props.body.expiredAtTo !== undefined
      ? {
          expired_at: {
            ...(props.body.expiredAtFrom !== undefined
              ? { gte: new globalThis.Date(props.body.expiredAtFrom) }
              : {}),
            ...(props.body.expiredAtTo !== undefined
              ? { lte: new globalThis.Date(props.body.expiredAtTo) }
              : {}),
          },
        }
      : {}),
  };
  const orderBy: Prisma.mall_platform_customer_sessionsOrderByWithRelationInput =
    props.body.sort === "expiredAt"
      ? { expired_at: "desc" }
      : props.body.sort === "expiredAt_asc"
        ? { expired_at: "asc" }
        : props.body.sort === "createdAt_asc"
          ? { created_at: "asc" }
          : { created_at: "desc" };
  const records =
    await MyGlobal.prisma.mall_platform_customer_sessions.findMany({
      where,
      orderBy,
      skip,
      take: limit,
      ...MallPlatformCustomerSessionAtSummaryTransformer.select(),
    });
  const total = await MyGlobal.prisma.mall_platform_customer_sessions.count({
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
      MallPlatformCustomerSessionAtSummaryTransformer.transform,
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
// import { IMallPlatformCustomerSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCustomerSession";
// import { IPageIMallPlatformCustomerSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIMallPlatformCustomerSession";
// import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
// import { IMallPlatformCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCustomer";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function patchMallPlatformCustomerSessions(props: {
//   customer: CustomerPayload;
//   body: IMallPlatformCustomerSession.IRequest;
// }): Promise<IPageIMallPlatformCustomerSession.ISummary> {
//   const records = await MyGlobal.prisma.mall_platform_customer_sessions.findMany({
//     ...MallPlatformCustomerSessionAtSummaryTransformer.select(),
//     ...,
//   });
//   return {
//     pagination: {
//       current: ...,
//       limit: ...,
//       records: ...,
//       pages: ...,
//     },
//     data: await ArrayUtil.asyncMap(records, MallPlatformCustomerSessionAtSummaryTransformer.transform),
//   };
// }
// ```
//--------------------------------------------------------------