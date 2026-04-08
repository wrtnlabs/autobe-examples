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
import { AdministratorPayload } from "../decorators/payload/AdministratorPayload";
import { MallPlatformCustomerSessionAtSummaryTransformer } from "../transformers/MallPlatformCustomerSessionAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchMallPlatformAdministratorSessions(props: {
  administrator: AdministratorPayload;
  body: IMallPlatformCustomerSession.IRequest;
}): Promise<IPageIMallPlatformCustomerSession.ISummary> {
  const page: number = props.body.page ?? 1;
  const limit: number = props.body.limit ?? 100;
  const skip: number = (page - 1) * limit;
  const where: Prisma.mall_platform_customer_sessionsWhereInput = {
    AND: [
      ...(props.body.search !== undefined
        ? [
            {
              OR: [
                { ip: { contains: props.body.search } },
                { href: { contains: props.body.search } },
                { referrer: { contains: props.body.search } },
              ],
            },
          ]
        : []),
      ...(props.body.ip !== undefined ? [{ ip: props.body.ip }] : []),
      ...(props.body.href !== undefined ? [{ href: props.body.href }] : []),
      ...(props.body.referrer !== undefined
        ? [{ referrer: props.body.referrer }]
        : []),
      ...(props.body.createdAtFrom !== undefined
        ? [{ created_at: { gte: props.body.createdAtFrom } }]
        : []),
      ...(props.body.createdAtTo !== undefined
        ? [{ created_at: { lte: props.body.createdAtTo } }]
        : []),
      ...(props.body.expiredAtFrom !== undefined
        ? [{ expired_at: { gte: props.body.expiredAtFrom } }]
        : []),
      ...(props.body.expiredAtTo !== undefined
        ? [{ expired_at: { lte: props.body.expiredAtTo } }]
        : []),
    ],
  };
  const orderBy:
    | Prisma.mall_platform_customer_sessionsOrderByWithRelationInput
    | Prisma.mall_platform_customer_sessionsOrderByWithRelationInput[] =
    props.body.sort === "expiredAt"
      ? { expired_at: "desc" }
      : props.body.sort === "expiredAtAsc"
        ? { expired_at: "asc" }
        : props.body.sort === "createdAtAsc"
          ? { created_at: "asc" }
          : { created_at: "desc" };
  const records =
    await MyGlobal.prisma.mall_platform_customer_sessions.findMany({
      ...MallPlatformCustomerSessionAtSummaryTransformer.select(),
      where,
      orderBy,
      skip,
      take: limit,
    });
  const total: number =
    await MyGlobal.prisma.mall_platform_customer_sessions.count({
      where,
    });
  return {
    pagination: {
      current: page,
      limit: limit,
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
// export async function patchMallPlatformAdministratorSessions(props: {
//   administrator: AdministratorPayload;
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