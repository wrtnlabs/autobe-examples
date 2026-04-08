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
import { SuperadminPayload } from "../decorators/payload/SuperadminPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchEcommerceMallSuperAdminGuests(props: {
  superAdmin: SuperadminPayload;
  body: IEcommerceMallGuest.IRequest;
}): Promise<IPageIEcommerceMallGuest.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  const where: Prisma.ecommerce_mall_guestsWhereInput = {
    AND: [
      ...(props.body.createdAtStart !== undefined &&
      props.body.createdAtStart !== null
        ? [{ created_at: { gte: new Date(props.body.createdAtStart) } }]
        : []),
      ...(props.body.createdAtEnd !== undefined &&
      props.body.createdAtEnd !== null
        ? [{ created_at: { lte: new Date(props.body.createdAtEnd) } }]
        : []),
      ...(props.body.lastActivityAtStart !== undefined &&
      props.body.lastActivityAtStart !== null
        ? [
            {
              guest_sessions: {
                last_activity_at: {
                  gte: new Date(props.body.lastActivityAtStart),
                },
              },
            },
          ]
        : []),
      ...(props.body.lastActivityAtEnd !== undefined &&
      props.body.lastActivityAtEnd !== null
        ? [
            {
              guest_sessions: {
                last_activity_at: {
                  lte: new Date(props.body.lastActivityAtEnd),
                },
              },
            },
          ]
        : []),
      ...(props.body.ipPattern !== undefined && props.body.ipPattern !== null
        ? [{ guest_sessions: { ip: { contains: props.body.ipPattern } } }]
        : []),
      ...(props.body.userAgentPattern !== undefined &&
      props.body.userAgentPattern !== null
        ? [
            {
              guest_sessions: {
                user_agent: { contains: props.body.userAgentPattern },
              },
            },
          ]
        : []),
    ],
  };
  const [records, total] = await Promise.all([
    MyGlobal.prisma.ecommerce_mall_guests.findMany({
      where,
      skip,
      take: limit,
      orderBy: { created_at: "desc" },
      select: {
        id: true,
        created_at: true,
        guest_sessions: {
          orderBy: { access_token_expires_at: "desc" },
          take: 1,
          select: {
            access_token_expires_at: true,
          },
        },
      },
    }),
    MyGlobal.prisma.ecommerce_mall_guests.count({ where }),
  ]);
  const now = new Date();
  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
    data: records.map((record) => {
      const latestSession = record.guest_sessions[0];
      const expiresAt = latestSession?.access_token_expires_at ?? new Date(0);
      const status: "active" | "expired" =
        expiresAt > now ? "active" : "expired";
      return {
        id: record.id as string & tags.Format<"uuid">,
        createdAt: record.created_at.toISOString() as string &
          tags.Format<"date-time">,
        expiresAt: expiresAt.toISOString() as string & tags.Format<"date-time">,
        status,
      } satisfies IEcommerceMallGuest.ISummary;
    }),
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
// export async function patchEcommerceMallSuperAdminGuests(props: {
//   superAdmin: SuperadminPayload;
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