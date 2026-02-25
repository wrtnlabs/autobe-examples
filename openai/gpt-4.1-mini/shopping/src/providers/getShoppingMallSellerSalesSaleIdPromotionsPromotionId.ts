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

export async function getShoppingMallSellerSalesSaleIdPromotionsPromotionId(props: {
  seller: SellerPayload;
  saleId: string & tags.Format<"uuid">;
  promotionId: string & tags.Format<"uuid">;
}): Promise<IShoppingMallSalePromotion> {
  // Check if the seller owns the sale
  const sale = await MyGlobal.prisma.shopping_mall_sales.findUnique({
    where: { id: props.saleId },
    select: { seller_id: true, deleted_at: true },
  });
  if (!sale || sale.deleted_at !== null || sale.seller_id !== props.seller.id) {
    throw new HttpException("Forbidden", 403);
  }
  // Find the sale promotion
  const promotion =
    await MyGlobal.prisma.shopping_mall_sale_promotions.findFirstOrThrow({
      where: {
        id: props.promotionId,
        shopping_mall_sale_id: props.saleId,
        deleted_at: null,
      },
      ...ShoppingMallSalePromotionTransformer.select(),
    });
  return await ShoppingMallSalePromotionTransformer.transform(promotion);
}
