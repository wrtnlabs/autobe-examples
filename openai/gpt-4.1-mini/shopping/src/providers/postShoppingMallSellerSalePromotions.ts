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

export async function postShoppingMallSellerSalePromotions(props: {
  seller: SellerPayload;
  body: {
    shoppingMallSaleId: string & tags.Format<"uuid">;
    promotion_code: string | null;
    promotion_type: "percentage" | "fixed_amount" | "default";
    description: string | null;
    discount_value: number;
    discount_type: "percentage" | "fixed_amount";
    start_at: string & tags.Format<"date-time">;
    end_at: string & tags.Format<"date-time">;
    active: boolean;
  };
}): Promise<IShoppingMallSalePromotion> {
  const sale = await MyGlobal.prisma.shopping_mall_sales.findUnique({
    where: { id: props.body.shoppingMallSaleId },
  });
  if (!sale) throw new HttpException("Sale not found", 404);
  if (props.body.discount_value < 0) {
    throw new HttpException("discount_value must be >= 0", 400);
  }
  if (
    props.body.discount_type !== "percentage" &&
    props.body.discount_type !== "fixed_amount"
  ) {
    throw new HttpException(
      "discount_type must be either percentage or fixed_amount",
      400,
    );
  }
  if (props.body.promotion_code !== null) {
    const existing =
      await MyGlobal.prisma.shopping_mall_sale_promotions.findUnique({
        where: { promotion_code: props.body.promotion_code },
      });
    if (existing) {
      throw new HttpException("Duplicate promotion_code", 400);
    }
  }
  function isISODateTimeString(value: string): boolean {
    const iso8601Regex = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z$/;
    return iso8601Regex.test(value);
  }
  if (!isISODateTimeString(props.body.start_at)) {
    throw new HttpException(
      "start_at must be a valid ISO 8601 date-time string",
      400,
    );
  }
  if (!isISODateTimeString(props.body.end_at)) {
    throw new HttpException(
      "end_at must be a valid ISO 8601 date-time string",
      400,
    );
  }
  const now = toISOStringSafe(new Date());
  const created = await MyGlobal.prisma.shopping_mall_sale_promotions.create({
    data: {
      id: v4(),
      shopping_mall_sale_id: props.body.shoppingMallSaleId,
      promotion_code: props.body.promotion_code,
      promotion_type: props.body.promotion_type,
      description: props.body.description,
      discount_value: props.body.discount_value,
      discount_type: props.body.discount_type,
      start_at: props.body.start_at,
      end_at: props.body.end_at,
      active: props.body.active,
      created_at: now,
      updated_at: now,
      deleted_at: null,
    },
  });
  return {
    id: created.id,
    shopping_mall_sale_id: created.shopping_mall_sale_id,
    promotion_code: created.promotion_code,
    promotion_type: created.promotion_type,
    description: created.description,
    discount_value: created.discount_value,
    discount_type: created.discount_type,
    start_at: created.start_at,
    end_at: created.end_at,
    active: created.active,
    created_at: created.created_at,
    updated_at: created.updated_at,
    deleted_at: created.deleted_at,
  };
}
