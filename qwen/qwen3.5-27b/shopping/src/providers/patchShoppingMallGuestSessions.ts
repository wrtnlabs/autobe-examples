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
  // Build WHERE clause
  const whereInput = {
    shopping_mall_guest_id: props.guest.id,
    ...(props.body.status === "active" && {
      expired_at: { gt: new Date() },
    }),
    ...(props.body.status === "expired" && {
      expired_at: { lte: new Date() },
    }),
    ...(props.body.status === "revoked" && {}),
    ...(props.body.startDate && {
      created_at: { gte: new Date(props.body.startDate) },
    }),
    ...(props.body.endDate && {
      created_at: { lte: new Date(props.body.endDate) },
    }),
  } satisfies Prisma.shopping_mall_guest_sessionsWhereInput;
  // Build ORDER BY clause
  const orderByInput = (() => {
    const sort = props.body.sort ?? "created_at";
    const order = props.body.order ?? "desc";
    return {
      [sort]: order,
    };
  })() satisfies Prisma.shopping_mall_guest_sessionsOrderByWithRelationInput;
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
  return {
    data: await ArrayUtil.asyncMap(
      data,
      ShoppingMallGuestSessionAtSummaryTransformer.transform,
    ),
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
