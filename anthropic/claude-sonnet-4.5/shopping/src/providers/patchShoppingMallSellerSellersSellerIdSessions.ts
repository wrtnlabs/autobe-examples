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
import { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { SellerPayload } from "../decorators/payload/SellerPayload";

export async function patchShoppingMallSellerSellersSellerIdSessions(props: {
  seller: SellerPayload;
  sellerId: string & tags.Format<"uuid">;
  body: IShoppingMallSellerSession.IRequest;
}): Promise<IPageIShoppingMallSellerSession.ISummary> {
  if (props.seller.id !== props.sellerId) {
    throw new HttpException("You can only access your own session data", 403);
  }

  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;

  const [sessions, total] = await Promise.all([
    MyGlobal.prisma.shopping_mall_seller_sessions.findMany({
      where: {
        shopping_mall_seller_id: props.sellerId,
        ...(props.body.ip && { ip: props.body.ip }),
        ...(props.body.href && { href: props.body.href }),
        ...(props.body.referrer && { referrer: props.body.referrer }),
        ...(props.body.search && {
          OR: [
            { ip: { contains: props.body.search } },
            { href: { contains: props.body.search } },
            { referrer: { contains: props.body.search } },
          ],
        }),
        ...((props.body.created_at_after || props.body.created_at_before) && {
          created_at: {
            ...(props.body.created_at_after && {
              gte: new Date(props.body.created_at_after),
            }),
            ...(props.body.created_at_before && {
              lte: new Date(props.body.created_at_before),
            }),
          },
        }),
        ...((props.body.expired_at_after || props.body.expired_at_before) && {
          expired_at: {
            ...(props.body.expired_at_after && {
              gte: new Date(props.body.expired_at_after),
            }),
            ...(props.body.expired_at_before && {
              lte: new Date(props.body.expired_at_before),
            }),
          },
        }),
      },
      skip,
      take: limit,
      orderBy:
        props.body.sort && props.body.sort.length > 0
          ? props.body.sort.map((sortItem) =>
              sortItem.startsWith("-")
                ? { [sortItem.substring(1)]: "desc" as const }
                : {
                    [sortItem.startsWith("+")
                      ? sortItem.substring(1)
                      : sortItem]: "asc" as const,
                  },
            )
          : [{ created_at: "desc" as const }],
    }),
    MyGlobal.prisma.shopping_mall_seller_sessions.count({
      where: {
        shopping_mall_seller_id: props.sellerId,
        ...(props.body.ip && { ip: props.body.ip }),
        ...(props.body.href && { href: props.body.href }),
        ...(props.body.referrer && { referrer: props.body.referrer }),
        ...(props.body.search && {
          OR: [
            { ip: { contains: props.body.search } },
            { href: { contains: props.body.search } },
            { referrer: { contains: props.body.search } },
          ],
        }),
        ...((props.body.created_at_after || props.body.created_at_before) && {
          created_at: {
            ...(props.body.created_at_after && {
              gte: new Date(props.body.created_at_after),
            }),
            ...(props.body.created_at_before && {
              lte: new Date(props.body.created_at_before),
            }),
          },
        }),
        ...((props.body.expired_at_after || props.body.expired_at_before) && {
          expired_at: {
            ...(props.body.expired_at_after && {
              gte: new Date(props.body.expired_at_after),
            }),
            ...(props.body.expired_at_before && {
              lte: new Date(props.body.expired_at_before),
            }),
          },
        }),
      },
    }),
  ]);

  const sellerData = await MyGlobal.prisma.shopping_mall_sellers.findUnique({
    where: { id: props.sellerId },
  });

  if (!sellerData) {
    throw new HttpException("Seller not found", 404);
  }

  return {
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
    data: sessions.map((session) => ({
      id: session.id as string & tags.Format<"uuid">,
      seller: {
        id: sellerData.id as string & tags.Format<"uuid">,
        store_name: sellerData.store_name,
        email: sellerData.email as string & tags.Format<"email">,
        status: sellerData.status as
          | "pending"
          | "approved"
          | "rejected"
          | "suspended",
        email_verified: sellerData.email_verified,
      },
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
