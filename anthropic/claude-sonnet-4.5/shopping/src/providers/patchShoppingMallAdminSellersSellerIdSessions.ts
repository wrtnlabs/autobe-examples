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
import { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function patchShoppingMallAdminSellersSellerIdSessions(props: {
  admin: AdminPayload;
  sellerId: string & tags.Format<"uuid">;
  body: IShoppingMallSellerSession.IRequest;
}): Promise<IPageIShoppingMallSellerSession.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;

  const buildWhereCondition = () => {
    const conditions: Record<string, unknown> = {
      shopping_mall_seller_id: props.sellerId,
    };

    if (props.body.shopping_mall_seller_id) {
      conditions.shopping_mall_seller_id = props.body.shopping_mall_seller_id;
    }

    if (props.body.ip) {
      conditions.ip = props.body.ip;
    }

    if (props.body.href) {
      conditions.href = props.body.href;
    }

    if (props.body.referrer) {
      conditions.referrer = props.body.referrer;
    }

    if (props.body.search) {
      conditions.OR = [
        { ip: { contains: props.body.search, mode: "insensitive" } },
        { href: { contains: props.body.search, mode: "insensitive" } },
        { referrer: { contains: props.body.search, mode: "insensitive" } },
      ];
    }

    if (props.body.created_at_after || props.body.created_at_before) {
      const createdAtCondition: Record<string, unknown> = {};
      if (props.body.created_at_after) {
        createdAtCondition.gte = new Date(props.body.created_at_after);
      }
      if (props.body.created_at_before) {
        createdAtCondition.lte = new Date(props.body.created_at_before);
      }
      conditions.created_at = createdAtCondition;
    }

    if (props.body.expired_at_after || props.body.expired_at_before) {
      const expiredAtCondition: Record<string, unknown> = {};
      if (props.body.expired_at_after) {
        expiredAtCondition.gte = new Date(props.body.expired_at_after);
      }
      if (props.body.expired_at_before) {
        expiredAtCondition.lte = new Date(props.body.expired_at_before);
      }
      conditions.expired_at = expiredAtCondition;
    }

    return conditions;
  };

  const buildOrderBy = () => {
    if (!props.body.sort || props.body.sort.length === 0) {
      return undefined;
    }

    return props.body.sort.map((sortField) => {
      if (sortField.startsWith("-")) {
        const field = sortField.substring(1);
        return { [field]: "desc" };
      } else if (sortField.startsWith("+")) {
        const field = sortField.substring(1);
        return { [field]: "asc" };
      } else {
        return { [sortField]: "asc" };
      }
    });
  };

  const whereCondition = buildWhereCondition();
  const orderByCondition = buildOrderBy();

  const [sessions, total] = await Promise.all([
    MyGlobal.prisma.shopping_mall_seller_sessions.findMany({
      where: whereCondition,
      skip: skip,
      take: limit,
      orderBy: orderByCondition,
    }),
    MyGlobal.prisma.shopping_mall_seller_sessions.count({
      where: whereCondition,
    }),
  ]);

  const sellerIds = [
    ...new Set(sessions.map((s) => s.shopping_mall_seller_id)),
  ];
  const sellers = await MyGlobal.prisma.shopping_mall_sellers.findMany({
    where: {
      id: { in: sellerIds },
    },
  });

  const sellerMap = new Map(sellers.map((seller) => [seller.id, seller]));

  return {
    data: sessions.map((session) => {
      const seller = sellerMap.get(session.shopping_mall_seller_id);
      if (!seller) {
        throw new HttpException("Seller not found for session", 404);
      }
      return {
        id: session.id,
        seller: {
          id: seller.id,
          store_name: seller.store_name,
          email: seller.email,
          status: seller.status as
            | "pending"
            | "approved"
            | "rejected"
            | "suspended",
          email_verified: seller.email_verified,
        },
        ip: session.ip,
        href: session.href,
        referrer: session.referrer,
        created_at: toISOStringSafe(session.created_at),
        expired_at: session.expired_at
          ? toISOStringSafe(session.expired_at)
          : null,
      };
    }),
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
  };
}
