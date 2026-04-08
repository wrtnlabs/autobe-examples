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
  const current: number = props.body.page ?? 1;
  const limit: number = props.body.limit ?? 100;
  const page: number = current < 1 ? 1 : current;
  const size: number = limit < 1 ? 1 : limit;
  const skip: number = (page - 1) * size;
  const where: Prisma.mall_platform_customer_sessionsWhereInput = {
    ...(props.body.id !== undefined && { id: props.body.id }),
    ...(props.body.mallPlatformCustomerId !== undefined && {
      mall_platform_customer_id: props.body.mallPlatformCustomerId,
    }),
    ...(props.body.ip !== undefined && { ip: props.body.ip }),
    ...(props.body.href !== undefined && { href: props.body.href }),
    ...(props.body.referrer !== undefined && { referrer: props.body.referrer }),
    ...(props.body.search !== undefined && props.body.search.length > 0
      ? {
          OR: [
            { ip: { contains: props.body.search, mode: "insensitive" } },
            { href: { contains: props.body.search, mode: "insensitive" } },
            { referrer: { contains: props.body.search, mode: "insensitive" } },
          ],
        }
      : {}),
  };
  const orderBy: Prisma.mall_platform_customer_sessionsOrderByWithRelationInput =
    props.body.sort === "ip"
      ? { ip: props.body.order ?? "desc" }
      : props.body.sort === "href"
        ? { href: props.body.order ?? "desc" }
        : props.body.sort === "referrer"
          ? { referrer: props.body.order ?? "desc" }
          : props.body.sort === "expiredAt"
            ? { expired_at: props.body.order ?? "desc" }
            : { created_at: props.body.order ?? "desc" };
  const records =
    await MyGlobal.prisma.mall_platform_customer_sessions.findMany({
      where,
      skip,
      take: size,
      orderBy,
      ...MallPlatformCustomerSessionAtSummaryTransformer.select(),
    });
  const total = await MyGlobal.prisma.mall_platform_customer_sessions.count({
    where,
  });
  return {
    pagination: {
      current: page,
      limit: size,
      records: total,
      pages: Math.ceil(total / size),
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