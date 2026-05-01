import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIShoppingMallGuestSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallGuestSession";
import { IShoppingMallGuestSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallGuestSession";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchShoppingMallAdminGuestsGuestIdSessions(props: {
  admin: AdminPayload;
  guestId: string & tags.Format<"uuid">;
  body: IShoppingMallGuestSession.IRequest;
}): Promise<IPageIShoppingMallGuestSession.ISummary> {
  // Validate guest exists and has not been cleaned up
  await MyGlobal.prisma.shopping_mall_guests.findUniqueOrThrow({
    where: { id: props.guestId, deleted_at: null },
  });
  const page: number = props.body.page ?? 1;
  const limit: number = props.body.limit ?? 20;
  // If actorType filter is specified and not "guest", return empty results
  if (props.body.actorType !== undefined && props.body.actorType !== "guest") {
    return {
      data: [],
      pagination: {
        current: page,
        limit,
        records: 0,
        pages: 0,
      } satisfies IPage.IPagination,
    };
  }
  // If actorId filter is specified and does not match guestId, return empty results
  if (
    props.body.actorId !== undefined &&
    props.body.actorId !== props.guestId
  ) {
    return {
      data: [],
      pagination: {
        current: page,
        limit,
        records: 0,
        pages: 0,
      } satisfies IPage.IPagination,
    };
  }
  const skip: number = (page - 1) * limit;
  const whereInput = {
    shopping_mall_guest_id: props.guestId,
    ...(props.body.ip !== undefined && { ip: { contains: props.body.ip } }),
    ...((props.body.createdFrom !== undefined ||
      props.body.createdTo !== undefined) && {
      created_at: {
        ...(props.body.createdFrom !== undefined && {
          gte: props.body.createdFrom,
        }),
        ...(props.body.createdTo !== undefined && { lt: props.body.createdTo }),
      },
    }),
    ...((props.body.expiredFrom !== undefined ||
      props.body.expiredTo !== undefined ||
      props.body.isActive !== undefined) && {
      expired_at: {
        ...(props.body.expiredFrom !== undefined && {
          gte: props.body.expiredFrom,
        }),
        ...(props.body.expiredTo !== undefined && { lt: props.body.expiredTo }),
        ...(props.body.isActive === true && { gt: new Date().toISOString() }),
        ...(props.body.isActive === false && { lte: new Date().toISOString() }),
      },
    }),
  } satisfies Prisma.shopping_mall_guest_sessionsWhereInput;
  const data = await MyGlobal.prisma.shopping_mall_guest_sessions.findMany({
    where: whereInput,
    skip,
    take: limit,
    orderBy: { created_at: "desc" },
  });
  const total: number =
    await MyGlobal.prisma.shopping_mall_guest_sessions.count({
      where: whereInput,
    });
  const now: string = new Date().toISOString();
  return {
    data: data.map(
      (record): IShoppingMallGuestSession.ISummary => ({
        actorType: "guest",
        id: record.id,
        actorId: record.shopping_mall_guest_id,
        ip: record.ip,
        href: record.href,
        referrer: record.referrer,
        created_at: record.created_at.toISOString(),
        expired_at: record.expired_at.toISOString(),
        isActive: record.expired_at.toISOString() > now,
      }),
    ),
    pagination: {
      current: page,
      limit,
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
// import { IShoppingMallGuestSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallGuestSession";
// import { IPageIShoppingMallGuestSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallGuestSession";
// import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function patchShoppingMallAdminGuestsGuestIdSessions(props: {
//   admin: AdminPayload;
//   guestId: string & tags.Format<"uuid">;
//   body: IShoppingMallGuestSession.IRequest;
// }): Promise<IPageIShoppingMallGuestSession.ISummary> {
//   // No matching Collector/Transformer found for this operation.
//     // You MUST call getDatabaseSchemas first to get exact relation property names.
//     // NEVER guess relation names from table names — always verify against the schema.
//     ...
// }
// ```
//--------------------------------------------------------------