import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
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

export async function getShoppingMallAdministratorSalePromotionsPromotionId(props: {
  administrator: AdministratorPayload;
  promotionId: string & tags.Format<"uuid">;
}): Promise<IShoppingMallSalePromotion> {
  const promotion =
    await MyGlobal.prisma.shopping_mall_sale_promotions.findUnique({
      where: { id: props.promotionId },
      select: {
        id: true,
        shopping_mall_sale_id: true,
        promotion_code: true,
        promotion_type: true,
        description: true,
        discount_value: true,
        discount_type: true,
        start_at: true,
        end_at: true,
        active: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
      },
    });
  if (!promotion) throw new HttpException("Sale promotion not found", 404);
  return {
    id: promotion.id,
    shopping_mall_sale_id: promotion.shopping_mall_sale_id,
    promotion_code:
      promotion.promotion_code === null ? null : promotion.promotion_code,
    promotion_type: promotion.promotion_type,
    description: promotion.description === null ? null : promotion.description,
    discount_value: promotion.discount_value,
    discount_type: promotion.discount_type,
    start_at: toISOStringSafe(promotion.start_at),
    end_at: toISOStringSafe(promotion.end_at),
    active: promotion.active,
    created_at: toISOStringSafe(promotion.created_at),
    updated_at: toISOStringSafe(promotion.updated_at),
    deleted_at:
      promotion.deleted_at === null
        ? null
        : toISOStringSafe(promotion.deleted_at),
  };
}
