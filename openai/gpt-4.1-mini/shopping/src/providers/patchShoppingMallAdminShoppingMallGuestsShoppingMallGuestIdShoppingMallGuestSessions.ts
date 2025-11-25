import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallGuestSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallGuestSession";
import { IPageIShoppingMallGuestSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallGuestSession";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function patchShoppingMallAdminShoppingMallGuestsShoppingMallGuestIdShoppingMallGuestSessions(props: {
  admin: AdminPayload;
  shoppingMallGuestId: string;
  body: IShoppingMallGuestSession.IRequest;
}): Promise<IPageIShoppingMallGuestSession.ISummary> {
  const page = props.body.page && props.body.page > 0 ? props.body.page : 1;
  const limit =
    props.body.limit && props.body.limit > 0 ? props.body.limit : 100;
  const skip = (page - 1) * limit;

  const whereCondition = {
    shopping_mall_guest_id: props.shoppingMallGuestId,
    ...(props.body.search
      ? {
          OR: [
            { ip: { contains: props.body.search } },
            { href: { contains: props.body.search } },
            { referrer: { contains: props.body.search } },
          ],
        }
      : {}),
  };

  const [sessions, total] = await Promise.all([
    MyGlobal.prisma.shopping_mall_guest_sessions.findMany({
      where: whereCondition,
      skip,
      take: limit,
      orderBy: { created_at: "desc" },
    }),
    MyGlobal.prisma.shopping_mall_guest_sessions.count({
      where: whereCondition,
    }),
  ]);

  return {
    data: sessions.map((session) => ({
      id: session.id,
      shopping_mall_guest_id: session.shopping_mall_guest_id,
      ip: session.ip,
      href: session.href,
      referrer: session.referrer,
      created_at: toISOStringSafe(session.created_at),
      expired_at:
        session.expired_at === null
          ? null
          : toISOStringSafe(session.expired_at),
    })),
    pagination: {
      current: page satisfies number as number &
        tags.Type<"int32"> &
        tags.Minimum<0>,
      limit: limit satisfies number as number &
        tags.Type<"int32"> &
        tags.Minimum<0>,
      records: total,
      pages: Math.ceil(total / limit),
    },
  };
}
