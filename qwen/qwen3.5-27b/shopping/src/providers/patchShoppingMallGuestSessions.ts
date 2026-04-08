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
import { GuestPayload } from "../decorators/payload/GuestPayload";
import { ShoppingMallGuestSessionAtSummaryTransformer } from "../transformers/ShoppingMallGuestSessionAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchShoppingMallGuestSessions(props: {
  guest: GuestPayload;
  body: IShoppingMallGuestSession.IRequest;
}): Promise<IPageIShoppingMallGuestSession.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  const now = new Date();
  const whereInput: Prisma.shopping_mall_guest_sessionsWhereInput = {
    ...(props.body.status === "active" && { expired_at: { gt: now } }),
    ...(props.body.status === "expired" && { expired_at: { lte: now } }),
    ...(props.body.ip && { ip: { contains: props.body.ip } }),
    ...(props.body.createdAtFrom && {
      created_at: { gte: new Date(props.body.createdAtFrom) },
    }),
    ...(props.body.createdAtTo && {
      created_at: { lte: new Date(props.body.createdAtTo) },
    }),
    ...(props.body.expiredAtFrom && {
      expired_at: { gte: new Date(props.body.expiredAtFrom) },
    }),
    ...(props.body.expiredAtTo && {
      expired_at: { lte: new Date(props.body.expiredAtTo) },
    }),
  };
  const sortField = props.body.sort;
  const orderByInput: Prisma.shopping_mall_guest_sessionsOrderByWithRelationInput =
    sortField === "id ASC"
      ? { id: "asc" }
      : sortField === "id DESC"
        ? { id: "desc" }
        : sortField === "ip ASC"
          ? { ip: "asc" }
          : sortField === "ip DESC"
            ? { ip: "desc" }
            : sortField === "href ASC"
              ? { href: "asc" }
              : sortField === "href DESC"
                ? { href: "desc" }
                : sortField === "created_at ASC"
                  ? { created_at: "asc" }
                  : sortField === "created_at DESC"
                    ? { created_at: "desc" }
                    : sortField === "expired_at ASC"
                      ? { expired_at: "asc" }
                      : sortField === "expired_at DESC"
                        ? { expired_at: "desc" }
                        : { created_at: "desc" };
  const data = await MyGlobal.prisma.shopping_mall_guest_sessions.findMany({
    where: whereInput,
    skip,
    take: limit,
    orderBy: orderByInput,
    ...ShoppingMallGuestSessionAtSummaryTransformer.select(),
  });
  const total = await MyGlobal.prisma.shopping_mall_guest_sessions.count({
    where: whereInput,
  });
  const transformed = await ArrayUtil.asyncMap(
    data,
    ShoppingMallGuestSessionAtSummaryTransformer.transform,
  );
  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
    data: transformed,
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
// export async function patchShoppingMallGuestSessions(props: {
//   guest: GuestPayload;
//   body: IShoppingMallGuestSession.IRequest;
// }): Promise<IPageIShoppingMallGuestSession.ISummary> {
//   const records = await MyGlobal.prisma.shopping_mall_guest_sessions.findMany({
//     ...ShoppingMallGuestSessionAtSummaryTransformer.select(),
//     ...,
//   });
//   return {
//     pagination: {
//       current: ...,
//       limit: ...,
//       records: ...,
//       pages: ...,
//     },
//     data: await ArrayUtil.asyncMap(records, ShoppingMallGuestSessionAtSummaryTransformer.transform),
//   };
// }
// ```
//--------------------------------------------------------------