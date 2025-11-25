import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallSellerSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerSession";
import { IPageIShoppingMallSellerSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallSellerSession";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { SellerPayload } from "../decorators/payload/SellerPayload";

export async function patchShoppingMallSellerSellersSellerIdSessions(props: {
  seller: SellerPayload;
  sellerId: string & tags.Format<"uuid">;
  body: IShoppingMallSellerSession.IRequest;
}): Promise<IPageIShoppingMallSellerSession.ISummary> {
  // Restrict to the authenticated seller's own account
  if (props.seller.id !== props.sellerId) {
    throw new HttpException(
      "Forbidden: You can only list your own sessions.",
      403,
    );
  }

  const pageNumber = props.body.page !== undefined ? props.body.page : 1;
  const limitValue =
    props.body.limit !== undefined ? Math.min(props.body.limit, 100) : 20;
  const skipValue = (pageNumber - 1) * limitValue;

  const whereCondition = {
    shopping_mall_seller_id: props.sellerId,
    ...(props.body.start_at
      ? { created_at: { gte: props.body.start_at } }
      : {}),
    ...(props.body.end_at ? { created_at: { lt: props.body.end_at } } : {}),
    ...(props.body.ip
      ? {
          ip: {
            contains: props.body.ip,
            mode: "insensitive" as Prisma.QueryMode,
          },
        }
      : {}),
    ...(typeof props.body.expired === "boolean"
      ? props.body.expired
        ? { NOT: { expired_at: null } }
        : { expired_at: null }
      : {}),
  };

  const [sessions, total] = await Promise.all([
    MyGlobal.prisma.shopping_mall_seller_sessions.findMany({
      where: whereCondition,
      orderBy: { created_at: "desc" },
      skip: skipValue,
      take: limitValue,
    }),
    MyGlobal.prisma.shopping_mall_seller_sessions.count({
      where: whereCondition,
    }),
  ]);

  return {
    pagination: {
      current: pageNumber,
      limit: limitValue,
      records: total,
      pages: Math.ceil(total / limitValue),
    },
    data: sessions.map((session) => ({
      id: session.id,
      shopping_mall_seller_id: session.shopping_mall_seller_id,
      ip: session.ip,
      href: session.href,
      referrer: session.referrer,
      created_at: toISOStringSafe(session.created_at),
      expired_at:
        session.expired_at === null || session.expired_at === undefined
          ? undefined
          : toISOStringSafe(session.expired_at),
    })),
  };
}
