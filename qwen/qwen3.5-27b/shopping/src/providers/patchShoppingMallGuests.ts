import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIShoppingMallGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallGuest";
import { IShoppingMallGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallGuest";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchShoppingMallGuests(props: {
  body: IShoppingMallGuest.IRequest;
}): Promise<IPageIShoppingMallGuest.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  const whereInput = {
    deleted_at: props.body.include_deleted === true ? undefined : null,
    ...(props.body.search && {
      OR: [
        { device_fingerprint: { contains: props.body.search } },
        { ip: { contains: props.body.search } },
      ],
    }),
    ...(props.body.created_at_from && {
      created_at: { gte: new Date(props.body.created_at_from) },
    }),
    ...(props.body.created_at_to && {
      created_at: { lte: new Date(props.body.created_at_to) },
    }),
  } satisfies Prisma.shopping_mall_guestsWhereInput;
  const data = await MyGlobal.prisma.shopping_mall_guests.findMany({
    where: whereInput,
    skip,
    take: limit,
    orderBy: { created_at: "desc" },
    select: {
      id: true,
      device_fingerprint: true,
      ip: true,
      created_at: true,
      updated_at: true,
    },
  });
  const total = await MyGlobal.prisma.shopping_mall_guests.count({
    where: whereInput,
  });
  const now = new Date();
  const guestIds = data.map((g) => g.id);
  const sessionCounts =
    await MyGlobal.prisma.shopping_mall_guest_sessions.groupBy({
      by: ["shopping_mall_guest_id"],
      where: {
        shopping_mall_guest_id: { in: guestIds },
        expired_at: { gt: now },
      },
      _count: true,
    });
  const sessionCountMap = new Map(
    sessionCounts.map((s) => [s.shopping_mall_guest_id, s._count]),
  );
  const transformedData = data.map((guest) => ({
    id: guest.id as string & tags.Format<"uuid">,
    device_fingerprint: guest.device_fingerprint,
    ip: guest.ip,
    created_at: guest.created_at.toISOString() as string &
      tags.Format<"date-time">,
    updated_at: guest.updated_at.toISOString() as string &
      tags.Format<"date-time">,
    active_session_count: sessionCountMap.get(guest.id) ?? 0,
  }));
  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
    data: transformedData,
  };
}
