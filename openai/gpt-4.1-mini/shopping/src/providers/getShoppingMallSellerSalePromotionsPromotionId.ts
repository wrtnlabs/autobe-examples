import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
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

export async function getShoppingMallSellerSalePromotionsPromotionId(props: {
  seller: SellerPayload;
  promotionId: string & tags.Format<"uuid">;
}): Promise<IShoppingMallSalePromotion> {
  const promotion =
    await MyGlobal.prisma.shopping_mall_sale_promotions.findUnique({
      where: { id: props.promotionId },
    });
  if (!promotion) {
    throw new HttpException("Promotion not found", 404);
  }
  return {
    id: promotion.id,
    sale_id: promotion.shopping_mall_sale_id,
    promotion_code: promotion.promotion_code,
    promotion_type: promotion.promotion_type,
    discount_value: promotion.discount_value,
    discount_rate: null, // No source property available
    is_active: promotion.active,
    valid_from: promotion.start_at ? toISOStringSafe(promotion.start_at) : null,
    valid_until: promotion.end_at ? toISOStringSafe(promotion.end_at) : null,
    created_at: toISOStringSafe(promotion.created_at),
    updated_at: promotion.updated_at
      ? toISOStringSafe(promotion.updated_at)
      : null,
  };
}
