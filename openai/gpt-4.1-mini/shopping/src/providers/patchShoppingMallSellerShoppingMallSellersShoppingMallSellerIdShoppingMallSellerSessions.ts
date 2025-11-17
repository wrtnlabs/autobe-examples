import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
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

export async function patchShoppingMallSellerShoppingMallSellersShoppingMallSellerIdShoppingMallSellerSessions(props: {
  seller: SellerPayload;
  shoppingMallSellerId: string & tags.Format<"uuid">;
  body: IShoppingMallSellerSession.IRequest;
}): Promise<IPageIShoppingMallSellerSession.ISummary> {
  const page = props.body.page satisfies number as number;
  const limit = props.body.limit satisfies number as number;

  if (page <= 0) {
    throw new HttpException("page must be greater than 0", 400);
  }

  if (limit <= 0) {
    throw new HttpException("limit must be greater than 0", 400);
  }

  const skip = (page - 1) * limit;

  const validSortFields = ["created_at", "expired_at", "last_active_at", "ip"];
  const sortField =
    props.body.sortField && validSortFields.includes(props.body.sortField)
      ? props.body.sortField
      : "created_at";
  const sortOrder =
    props.body.sortOrder === "asc" || props.body.sortOrder === "desc"
      ? props.body.sortOrder
      : "desc";

  const where: Prisma.shopping_mall_seller_sessionsWhereInput = {
    shopping_mall_seller_id: props.shoppingMallSellerId,
  };

  if (props.body.filterActive === true) {
    where.expired_at = null;
  }

  const [sessions, total] = await Promise.all([
    MyGlobal.prisma.shopping_mall_seller_sessions.findMany({
      where,
      skip,
      take: limit,
      orderBy: {
        [sortField]: sortOrder,
      },
    }),
    MyGlobal.prisma.shopping_mall_seller_sessions.count({ where }),
  ]);

  return {
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
    data: sessions.map((session) => ({
      id: session.id,
      seller_id: session.shopping_mall_seller_id satisfies string as string,
      ip_address: session.ip ?? undefined,
      created_at: toISOStringSafe(session.created_at),
      last_active_at: null,
    })),
  };
}
