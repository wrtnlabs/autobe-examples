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

export async function putShoppingMallSellerSalePromotionsPromotionId(props: {
  seller: SellerPayload;
  promotionId: string & tags.Format<"uuid">;
  body: IShoppingMallSalePromotion.IUpdate;
}): Promise<IShoppingMallSalePromotion> {
  const existing =
    await MyGlobal.prisma.shopping_mall_sale_promotions.findUnique({
      where: { id: props.promotionId },
    });
  if (!existing) {
    throw new HttpException("Promotion not found", 404);
  }
  // Since IUpdate has no fields, no update occurs
  // Return existing with date fields converted
  return {
    id: existing.id,
    shopping_mall_sale_id: existing.shopping_mall_sale_id,
    promotion_code: existing.promotion_code,
    promotion_type: existing.promotion_type,
    description: existing.description,
    discount_value: existing.discount_value,
    discount_type: existing.discount_type,
    start_at: toISOStringSafe(existing.start_at),
    end_at: toISOStringSafe(existing.end_at),
    active: existing.active,
    created_at: toISOStringSafe(existing.created_at),
    updated_at: toISOStringSafe(existing.updated_at),
    deleted_at: existing.deleted_at
      ? toISOStringSafe(existing.deleted_at)
      : null,
  };
}
