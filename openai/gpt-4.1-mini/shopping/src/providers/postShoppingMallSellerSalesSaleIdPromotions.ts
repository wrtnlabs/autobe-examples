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
import { ShoppingMallSalePromotionCollector } from "../collectors/ShoppingMallSalePromotionCollector";
import { SellerPayload } from "../decorators/payload/SellerPayload";
import { ShoppingMallSalePromotionTransformer } from "../transformers/ShoppingMallSalePromotionTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postShoppingMallSellerSalesSaleIdPromotions(props: {
  seller: SellerPayload;
  saleId: string & tags.Format<"uuid">;
  body: IShoppingMallSalePromotion.ICreate;
}): Promise<IShoppingMallSalePromotion> {
  const sale = await MyGlobal.prisma.shopping_mall_sales.findUnique({
    where: { id: props.saleId },
    select: { id: true, seller_id: true },
  });
  if (sale === null || sale.seller_id !== props.seller.id) {
    throw new HttpException("Unauthorized", 403);
  }
  const startAtISO = toISOStringSafe(props.body.startAt);
  const endAtISO = toISOStringSafe(props.body.endAt);
  if (startAtISO >= endAtISO) {
    throw new HttpException("startAt must be before endAt", 400);
  }
  const preparedBody = {
    ...props.body,
    startAt: startAtISO,
    endAt: endAtISO,
  };
  const data = await ShoppingMallSalePromotionCollector.collect({
    body: preparedBody,
    shoppingMallSales: {
      id: props.saleId,
      seller_id: props.seller.id,
    } as any,
  });
  const created = await MyGlobal.prisma.$transaction(async (tx) => {
    if (data.promotion_code !== null) {
      const existing = await tx.shopping_mall_sale_promotions.findUnique({
        where: { promotion_code: data.promotion_code },
        select: { id: true },
      });
      if (existing !== null) {
        throw new HttpException("Promotion code already in use", 400);
      }
    }
    return tx.shopping_mall_sale_promotions.create({ data });
  });
  const promotion =
    await MyGlobal.prisma.shopping_mall_sale_promotions.findUniqueOrThrow({
      where: { id: created.id },
      ...ShoppingMallSalePromotionTransformer.select(),
    });
  return ShoppingMallSalePromotionTransformer.transform(promotion);
}
