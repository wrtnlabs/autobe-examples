import { IECommerceMallSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallSession";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIECommerceMallSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIECommerceMallSession";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchECommerceMallCustomerSessions(props: {
  customer: CustomerPayload;
  body: IECommerceMallSession.IRequest;
}): Promise<IPageIECommerceMallSession.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  const nowISO: string = new Date(Date.now()).toISOString();
  const whereInput = {
    e_commerce_mall_customer_id: props.customer.id,
    ...(props.body.search ? { ip: { contains: props.body.search } } : {}),
    ...(props.body.created_at_from || props.body.created_at_to
      ? {
          created_at: {
            ...(props.body.created_at_from
              ? { gte: props.body.created_at_from }
              : {}),
            ...(props.body.created_at_to
              ? { lte: props.body.created_at_to }
              : {}),
          },
        }
      : {}),
    ...(props.body.expired_at_from || props.body.expired_at_to
      ? {
          expired_at: {
            ...(props.body.expired_at_from
              ? { gte: props.body.expired_at_from }
              : {}),
            ...(props.body.expired_at_to
              ? { lte: props.body.expired_at_to }
              : {}),
          },
        }
      : {}),
    ...(props.body.include_expired !== true
      ? { expired_at: { gt: nowISO } }
      : {}),
  } satisfies Prisma.e_commerce_mall_customer_sessionsWhereInput;
  const data = await MyGlobal.prisma.e_commerce_mall_customer_sessions.findMany(
    {
      where: whereInput,
      skip,
      take: limit,
      orderBy: { created_at: "desc" },
    },
  );
  const total = await MyGlobal.prisma.e_commerce_mall_customer_sessions.count({
    where: whereInput,
  });
  return {
    data: data.map((record) => ({
      id: record.id,
      ip: record.ip,
      href: record.href,
      referrer: record.referrer,
      created_at: record.created_at.toISOString(),
      expired_at: record.expired_at.toISOString(),
      isCurrent: record.id === props.customer.session_id,
    })),
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
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
// import { IECommerceMallSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallSession";
// import { IPageIECommerceMallSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIECommerceMallSession";
// import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function patchECommerceMallCustomerSessions(props: {
//   customer: CustomerPayload;
//   body: IECommerceMallSession.IRequest;
// }): Promise<IPageIECommerceMallSession.ISummary> {
//   // No matching Collector/Transformer found for this operation.
//     // You MUST call getDatabaseSchemas first to get exact relation property names.
//     // NEVER guess relation names from table names — always verify against the schema.
//     ...
// }
// ```
//--------------------------------------------------------------