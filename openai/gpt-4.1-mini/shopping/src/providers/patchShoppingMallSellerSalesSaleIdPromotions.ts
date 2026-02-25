import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallProductCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductCategory";
import { IShoppingMallSale } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSale";
import { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { SellerPayload } from "../decorators/payload/SellerPayload";
import { ShoppingMallSaleTransformer } from "../transformers/ShoppingMallSaleTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchShoppingMallSellerSalesSaleIdPromotions(props: {
  seller: SellerPayload;
  saleId: string & tags.Format<"uuid">;
  body: IShoppingMallSale.IPromotionUpdate;
}): Promise<IShoppingMallSale> {
  const sale = await MyGlobal.prisma.shopping_mall_sales.findUnique({
    where: { id: props.saleId },
    select: { id: true, seller_id: true },
  });
  if (!sale) throw new HttpException("Sale not found", 404);
  if (sale.seller_id !== props.seller.id)
    throw new HttpException("Forbidden", 403);
  const discount = props.body.discountPercentage;
  if (discount < 0 || discount > 100) {
    throw new HttpException(
      "Discount percentage must be between 0 and 100",
      400,
    );
  }
  const { startDate, endDate, conditions, active, title } = props.body;
  const isValidDateString = (
    dateStr: unknown,
  ): dateStr is string & tags.Format<"date-time"> => {
    return typeof dateStr === "string" && !Number.isNaN(Date.parse(dateStr));
  };
  if (startDate != null && !isValidDateString(startDate)) {
    throw new HttpException("Invalid startDate format", 400);
  }
  if (endDate != null && !isValidDateString(endDate)) {
    throw new HttpException("Invalid endDate format", 400);
  }
  if (startDate && endDate && startDate.localeCompare(endDate) > 0) {
    throw new HttpException(
      "startDate must be before or equal to endDate",
      400,
    );
  }
  const startAt = startDate ? new Date(startDate) : undefined;
  const endAt = endDate ? new Date(endDate) : undefined;
  const existingPromotion =
    await MyGlobal.prisma.shopping_mall_sale_promotions.findUnique({
      where: { id: props.saleId },
    });
  const now = new Date();
  if (!existingPromotion) {
    await MyGlobal.prisma.shopping_mall_sale_promotions.create({
      data: {
        id: props.saleId,
        sale: { connect: { id: props.saleId } },
        promotion_type: "discount",
        discount_type: "percentage",
        discount_value: discount,
        start_at: startAt ?? undefined,
        end_at: endAt ?? undefined,
        description: conditions ?? null,
        active: active,
        promotion_code: title ?? null,
        created_at: now,
        updated_at: now,
      },
    });
  } else {
    await MyGlobal.prisma.shopping_mall_sale_promotions.update({
      where: { id: props.saleId },
      data: {
        discount_value: discount,
        start_at: startAt ?? undefined,
        end_at: endAt ?? undefined,
        description: conditions ?? null,
        active: active,
        promotion_code: title ?? null,
        updated_at: now,
      },
    });
  }
  const updatedSale =
    await MyGlobal.prisma.shopping_mall_sales.findUniqueOrThrow({
      where: { id: props.saleId },
      ...ShoppingMallSaleTransformer.select(),
    });
  return await ShoppingMallSaleTransformer.transform(updatedSale);
}
