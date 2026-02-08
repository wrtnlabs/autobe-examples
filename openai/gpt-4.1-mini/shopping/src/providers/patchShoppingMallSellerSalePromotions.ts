import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIShoppingMallSalePromotion } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallSalePromotion";
import { IShoppingMallSalePromotion } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSalePromotion";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { SellerPayload } from "../decorators/payload/SellerPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchShoppingMallSellerSalePromotions(props: {
  seller: SellerPayload;
  body: IShoppingMallSalePromotion.IRequest;
}): Promise<IPageIShoppingMallSalePromotion.ISummary> {
  const page = (props.body as any).page ?? 1;
  const limit = (props.body as any).limit ?? 100;
  const skip = (page - 1) * limit;
  const where: {
    AND: Prisma.shopping_mall_sale_promotionsWhereInput[];
  } = {
    AND: [],
  };
  if (typeof (props.body as any).promotion_code === "string") {
    where.AND.push({
      promotion_code: { contains: (props.body as any).promotion_code },
    });
  }
  if (typeof (props.body as any).promotion_type === "string") {
    where.AND.push({ promotion_type: (props.body as any).promotion_type });
  }
  if (typeof (props.body as any).active === "boolean") {
    where.AND.push({ active: (props.body as any).active });
  }
  if (typeof (props.body as any).start_at === "string") {
    where.AND.push({ start_at: { gte: (props.body as any).start_at } });
  }
  if (typeof (props.body as any).end_at === "string") {
    where.AND.push({ end_at: { lte: (props.body as any).end_at } });
  }
  const whereFilter = where.AND.length > 0 ? { AND: where.AND } : {};
  const promotions =
    await MyGlobal.prisma.shopping_mall_sale_promotions.findMany({
      where: whereFilter,
      skip,
      take: limit,
      orderBy: { start_at: "desc" },
      select: {
        promotion_code: true,
        promotion_type: true,
        discount_value: true,
        discount_type: true,
        start_at: true,
        end_at: true,
        active: true,
      },
    });
  const total = await MyGlobal.prisma.shopping_mall_sale_promotions.count({
    where: whereFilter,
  });
  return {
    data: promotions.map((promotion) => {
      const startAt = toISOStringSafe(promotion.start_at);
      const endAt = toISOStringSafe(promotion.end_at);
      return {
        promotion_code: promotion.promotion_code,
        promotion_type: promotion.promotion_type,
        discount_percent:
          promotion.discount_type === "percent"
            ? promotion.discount_value
            : undefined,
        discount_fixed:
          promotion.discount_type === "fixed"
            ? promotion.discount_value
            : undefined,
        start_at: startAt as string & tags.Format<"date-time">,
        end_at: endAt as string & tags.Format<"date-time">,
        active: promotion.active,
      };
    }),
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: total > 0 ? Math.ceil(total / limit) : 0,
    },
  };
}
