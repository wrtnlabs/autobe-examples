import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallBuyerSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallBuyerSession";
import { IPageIShoppingMallBuyerSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallBuyerSession";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function patchShoppingMallAdminBuyersBuyerIdSessions(props: {
  admin: AdminPayload;
  buyerId: string & tags.Format<"uuid">;
  body: IShoppingMallBuyerSession.IRequest;
}): Promise<IPageIShoppingMallBuyerSession.ISummary> {
  const buyer = await MyGlobal.prisma.shopping_mall_buyers.findUnique({
    where: { id: props.buyerId },
  });

  if (!buyer) {
    throw new HttpException("Buyer not found", 404);
  }

  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;

  const buildWhereCondition = () => {
    const conditions: Record<string, unknown> = {
      shopping_mall_buyer_id: props.buyerId,
    };

    if (props.body.created_after || props.body.created_before) {
      conditions.created_at = {
        ...(props.body.created_after && {
          gte: new Date(props.body.created_after),
        }),
        ...(props.body.created_before && {
          lte: new Date(props.body.created_before),
        }),
      };
    }

    if (props.body.ip_address !== undefined && props.body.ip_address !== null) {
      conditions.ip = props.body.ip_address;
    }

    if (props.body.href !== undefined && props.body.href !== null) {
      conditions.href = props.body.href;
    }

    if (props.body.referrer !== undefined && props.body.referrer !== null) {
      conditions.referrer = props.body.referrer;
    }

    if (props.body.is_active !== undefined && props.body.is_active !== null) {
      conditions.expired_at = props.body.is_active ? null : { not: null };
    }

    return conditions;
  };

  const whereCondition = buildWhereCondition();

  const sortBy = props.body.sort_by ?? "created_at";
  const order = props.body.order ?? "desc";

  const [sessions, total] = await Promise.all([
    MyGlobal.prisma.shopping_mall_buyer_sessions.findMany({
      where: whereCondition,
      orderBy: { [sortBy]: order },
      skip,
      take: limit,
    }),
    MyGlobal.prisma.shopping_mall_buyer_sessions.count({
      where: whereCondition,
    }),
  ]);

  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
    data: sessions.map((session) => ({
      id: session.id,
      shopping_mall_buyer_id: session.shopping_mall_buyer_id,
      ip: session.ip,
      href: session.href,
      referrer: session.referrer,
      created_at: toISOStringSafe(session.created_at),
      expired_at: session.expired_at
        ? toISOStringSafe(session.expired_at)
        : null,
    })),
  };
}
