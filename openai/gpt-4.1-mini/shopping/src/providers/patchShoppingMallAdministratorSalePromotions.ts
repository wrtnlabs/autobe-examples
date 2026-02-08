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
import { AdministratorPayload } from "../decorators/payload/AdministratorPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchShoppingMallAdministratorSalePromotions(props: {
  administrator: AdministratorPayload;
  body: IShoppingMallSalePromotion.IRequest;
}): Promise<IPageIShoppingMallSalePromotion.ISummary> {
  const page =
    typeof (props.body as any).page === "number" ? (props.body as any).page : 1;
  const limit =
    typeof (props.body as any).limit === "number"
      ? (props.body as any).limit
      : 100;
  const where = {
    ...("promotion_code" in props.body &&
    typeof (props.body as any).promotion_code === "string"
      ? { promotion_code: { contains: (props.body as any).promotion_code } }
      : {}),
    ...("promotion_type" in props.body &&
    typeof (props.body as any).promotion_type === "string"
      ? { promotion_type: (props.body as any).promotion_type }
      : {}),
    ...("active" in props.body &&
    typeof (props.body as any).active === "boolean"
      ? { active: (props.body as any).active }
      : {}),
    ...("start_at" in props.body && (props.body as any).start_at
      ? { start_at: { gte: (props.body as any).start_at } }
      : {}),
    ...("end_at" in props.body && (props.body as any).end_at
      ? { end_at: { lte: (props.body as any).end_at } }
      : {}),
  } satisfies Prisma.shopping_mall_sale_promotionsWhereInput;
  const data = await MyGlobal.prisma.shopping_mall_sale_promotions.findMany({
    where,
    skip: (page - 1) * limit,
    take: limit,
    orderBy: { start_at: "desc" },
  });
  const total = await MyGlobal.prisma.shopping_mall_sale_promotions.count({
    where,
  });
  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: total === 0 ? 0 : Math.ceil(total / limit),
    },
    data: data.map((record) => {
      const discount_percent =
        record.discount_type === "percent" ? record.discount_value : null;
      const discount_amount =
        record.discount_type === "amount" ? record.discount_value : null;
      return {
        promotion_code: record.promotion_code || null,
        promotion_type: record.promotion_type,
        discount_percent: discount_percent,
        discount_amount: discount_amount,
        start_at: toISOStringSafe(record.start_at),
        end_at: toISOStringSafe(record.end_at),
        active: record.active,
      };
    }),
  };
}
