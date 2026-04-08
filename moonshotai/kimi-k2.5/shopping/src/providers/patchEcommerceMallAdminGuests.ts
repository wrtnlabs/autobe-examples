import { IEcommerceMallGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallGuest";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIEcommerceMallGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallGuest";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { EcommerceMallGuestAtSummaryTransformer } from "../transformers/EcommerceMallGuestAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchEcommerceMallAdminGuests(props: {
  admin: AdminPayload;
  body: IEcommerceMallGuest.IRequest;
}): Promise<IPageIEcommerceMallGuest.ISummary> {
  const page: number = props.body.page ?? 1;
  const limit: number = props.body.limit ?? 100;
  const skip: number = (page - 1) * limit;
  const conditions: Prisma.ecommerce_mall_guestsWhereInput[] = [];
  if (
    props.body.createdAtStart !== undefined &&
    props.body.createdAtStart !== null
  ) {
    conditions.push({
      created_at: { gte: new Date(props.body.createdAtStart) },
    });
  }
  if (
    props.body.createdAtEnd !== undefined &&
    props.body.createdAtEnd !== null
  ) {
    conditions.push({
      created_at: { lte: new Date(props.body.createdAtEnd) },
    });
  }
  if (
    props.body.lastActivityAtStart !== undefined &&
    props.body.lastActivityAtStart !== null
  ) {
    conditions.push({
      sessions: {
        some: {
          last_activity_at: { gte: new Date(props.body.lastActivityAtStart) },
        },
      },
    });
  }
  if (
    props.body.lastActivityAtEnd !== undefined &&
    props.body.lastActivityAtEnd !== null
  ) {
    conditions.push({
      sessions: {
        some: {
          last_activity_at: { lte: new Date(props.body.lastActivityAtEnd) },
        },
      },
    });
  }
  if (props.body.ipPattern !== undefined && props.body.ipPattern !== null) {
    conditions.push({
      sessions: {
        some: {
          ip: { contains: props.body.ipPattern },
        },
      },
    });
  }
  if (
    props.body.userAgentPattern !== undefined &&
    props.body.userAgentPattern !== null
  ) {
    conditions.push({
      sessions: {
        some: {
          user_agent: { contains: props.body.userAgentPattern },
        },
      },
    });
  }
  const where: Prisma.ecommerce_mall_guestsWhereInput =
    conditions.length > 0 ? { AND: conditions } : {};
  const [records, total]: [
    EcommerceMallGuestAtSummaryTransformer.Payload[],
    number,
  ] = await Promise.all([
    MyGlobal.prisma.ecommerce_mall_guests.findMany({
      where,
      skip,
      take: limit,
      orderBy: { created_at: "desc" },
      ...EcommerceMallGuestAtSummaryTransformer.select(),
    }),
    MyGlobal.prisma.ecommerce_mall_guests.count({ where }),
  ]);
  const data: IEcommerceMallGuest.ISummary[] = await ArrayUtil.asyncMap(
    records,
    EcommerceMallGuestAtSummaryTransformer.transform,
  );
  const pages: number = Math.ceil(total / limit);
  return {
    pagination: {
      current: page,
      limit,
      records: total,
      pages,
    } satisfies IPage.IPagination,
    data,
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
// import { IEcommerceMallGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallGuest";
// import { IPageIEcommerceMallGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallGuest";
// import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function patchEcommerceMallAdminGuests(props: {
//   admin: AdminPayload;
//   body: IEcommerceMallGuest.IRequest;
// }): Promise<IPageIEcommerceMallGuest.ISummary> {
//   const records = await MyGlobal.prisma.ecommerce_mall_guests.findMany({
//     ...EcommerceMallGuestAtSummaryTransformer.select(),
//     ...,
//   });
//   return {
//     pagination: {
//       current: ...,
//       limit: ...,
//       records: ...,
//       pages: ...,
//     },
//     data: await ArrayUtil.asyncMap(records, EcommerceMallGuestAtSummaryTransformer.transform),
//   };
// }
// ```
//--------------------------------------------------------------