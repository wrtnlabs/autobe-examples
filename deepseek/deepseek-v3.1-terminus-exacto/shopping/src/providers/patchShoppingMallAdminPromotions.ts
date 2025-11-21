import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallPromotion } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPromotion";
import { IPageIShoppingMallPromotion } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallPromotion";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function patchShoppingMallAdminPromotions(props: {
  admin: AdminPayload;
  body: IShoppingMallPromotion.IRequest;
}): Promise<IPageIShoppingMallPromotion.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;

  // Build WHERE condition using Prisma's query builder
  const whereCondition: Prisma.shopping_mall_promotionsWhereInput = {
    deleted_at: null,
    ...(props.body.search && {
      OR: [
        { name: { contains: props.body.search, mode: "insensitive" } },
        ...(props.body.search.trim().length > 0
          ? [
              {
                description: {
                  contains: props.body.search,
                  mode: "insensitive" as const,
                },
              },
            ]
          : []),
      ],
    }),
    ...(props.body.promotion_type && {
      promotion_type: props.body.promotion_type,
    }),
    ...(props.body.is_active !== undefined &&
      props.body.is_active !== null && { is_active: props.body.is_active }),
    ...(props.body.start_date_from && {
      start_date: { gte: props.body.start_date_from },
    }),
    ...(props.body.start_date_to && {
      start_date: { lte: props.body.start_date_to },
    }),
    ...(props.body.end_date_from && {
      end_date: { gte: props.body.end_date_from },
    }),
    ...(props.body.end_date_to && {
      end_date: { lte: props.body.end_date_to },
    }),
    ...(props.body.priority_min !== undefined &&
      props.body.priority_min !== null && {
        priority: { gte: props.body.priority_min },
      }),
    ...(props.body.priority_max !== undefined &&
      props.body.priority_max !== null && {
        priority: { lte: props.body.priority_max },
      }),
    ...(props.body.channel_code && {
      channel: { code: props.body.channel_code },
    }),
  };

  // Build ORDER BY condition
  const orderByCondition: Prisma.shopping_mall_promotionsOrderByWithRelationInput =
    props.body.order_by
      ? {
          [props.body.order_by]:
            props.body.order_direction === "desc" ? "desc" : "asc",
        }
      : { created_at: "desc" };

  // Execute concurrent queries for optimal performance
  const [data, total] = await Promise.all([
    MyGlobal.prisma.shopping_mall_promotions.findMany({
      where: whereCondition,
      skip,
      take: limit,
      orderBy: orderByCondition,
    }),
    MyGlobal.prisma.shopping_mall_promotions.count({
      where: whereCondition,
    }),
  ]);

  // Convert database results to API response format
  const promotions = data.map((promotion) => ({
    id: promotion.id as string & tags.Format<"uuid">,
    name: promotion.name,
    description: promotion.description ?? undefined,
    promotion_type: promotion.promotion_type,
    start_date: toISOStringSafe(promotion.start_date),
    end_date: toISOStringSafe(promotion.end_date),
    is_active: promotion.is_active,
    priority: promotion.priority,
    created_at: toISOStringSafe(promotion.created_at),
    updated_at: toISOStringSafe(promotion.updated_at),
  }));

  return {
    pagination: {
      current: page satisfies number as number,
      limit: limit satisfies number as number,
      records: total,
      pages: Math.ceil(total / limit),
    },
    data: promotions,
  };
}
