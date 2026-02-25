import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallProductCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductCategory";
import { IShoppingMallSale } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSale";
import { IShoppingMallSalePromotion } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSalePromotion";
import { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { SellerPayload } from "../decorators/payload/SellerPayload";
import { ShoppingMallSalePromotionTransformer } from "../transformers/ShoppingMallSalePromotionTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putShoppingMallSellerSalesSaleIdPromotionsPromotionId(props: {
  seller: SellerPayload;
  saleId: string & tags.Format<"uuid">;
  promotionId: string & tags.Format<"uuid">;
  body: IShoppingMallSalePromotion.IUpdate;
}): Promise<IShoppingMallSalePromotion> {
  // Validate the promotion exists and belongs to the sale and seller
  const promotion =
    await MyGlobal.prisma.shopping_mall_sale_promotions.findUnique({
      where: { id: props.promotionId },
      include: { sale: { select: { id: true, seller_id: true } } },
    });
  if (!promotion) throw new HttpException("Promotion not found", 404);
  if (promotion.shopping_mall_sale_id !== props.saleId)
    throw new HttpException(
      "Promotion does not belong to the specified sale",
      400,
    );
  if (promotion.sale.seller_id !== props.seller.id)
    throw new HttpException("Unauthorized to update this promotion", 403);
  // Validate discount_value is non-negative
  if (props.body.discount_value < 0)
    throw new HttpException("discount_value must be non-negative", 400);
  // Validate discount_type
  const allowedDiscountTypes = ["percentage", "fixed amount"];
  if (!allowedDiscountTypes.includes(props.body.discount_type))
    throw new HttpException(
      "Invalid discount_type. Must be 'percentage' or 'fixed amount'",
      400,
    );
  // Validate start_at < end_at
  if (props.body.start_at >= props.body.end_at)
    throw new HttpException("start_at must be before end_at", 400);
  // Prepare update data
  const now = new Date().toISOString() as string & tags.Format<"date-time">;
  // Update promotion in a transaction to ensure consistency
  const updated = await MyGlobal.prisma.$transaction(async (tx) => {
    await tx.shopping_mall_sale_promotions.update({
      where: { id: props.promotionId },
      data: {
        promotion_code: props.body.promotion_code ?? null,
        promotion_type: props.body.promotion_type,
        description: props.body.description ?? null,
        discount_value: props.body.discount_value,
        discount_type: props.body.discount_type,
        start_at: props.body.start_at,
        end_at: props.body.end_at,
        active: props.body.active,
        updated_at: now,
      },
    });
    return await tx.shopping_mall_sale_promotions.findUniqueOrThrow({
      where: { id: props.promotionId },
      ...ShoppingMallSalePromotionTransformer.select(),
    });
  });
  return await ShoppingMallSalePromotionTransformer.transform(updated);
}
