import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
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

export async function deleteShoppingMallSellerSalesSaleIdPromotionsPromotionId(props: {
  seller: SellerPayload;
  saleId: string & tags.Format<"uuid">;
  promotionId: string & tags.Format<"uuid">;
}): Promise<void> {
  // Confirm sale ownership
  const sale = await MyGlobal.prisma.shopping_mall_sales.findUniqueOrThrow({
    where: { id: props.saleId },
    select: { seller_id: true },
  });
  if (sale.seller_id !== props.seller.id) {
    throw new HttpException("Forbidden", 403);
  }
  // Confirm promotion exists and belongs to sale
  const promotion =
    await MyGlobal.prisma.shopping_mall_sale_promotions.findUniqueOrThrow({
      where: { id: props.promotionId },
    });
  if (promotion.shopping_mall_sale_id !== props.saleId) {
    throw new HttpException("Not Found", 404);
  }
  // Delete promotion
  await MyGlobal.prisma.shopping_mall_sale_promotions.delete({
    where: { id: props.promotionId },
  });
}
