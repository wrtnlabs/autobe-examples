import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallStockAdjustment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallStockAdjustment";
import { SellerPayload } from "../decorators/payload/SellerPayload";

export async function postShoppingMallSellerStockAdjustments(props: {
  seller: SellerPayload;
  body: IShoppingMallStockAdjustment.ICreate;
}): Promise<IShoppingMallStockAdjustment> {
  const { seller, body } = props;

  const sku = await MyGlobal.prisma.shopping_mall_product_skus.findUnique({
    where: { id: body.shopping_mall_product_sku_id },
  });

  if (!sku) {
    throw new HttpException("Product SKU not found", 404);
  }

  const createdAt = body.created_at ?? toISOStringSafe(new Date());

  const created = await MyGlobal.prisma.shopping_mall_stock_adjustments.create({
    data: {
      id: v4() satisfies string as string,
      adjustment_type: typia.assert<
        "addition" | "subtraction" | "reservation" | "release"
      >(body.adjustment_type),
      quantity: body.quantity,
      actor_type: typia.assert<"customer" | "seller" | "admin">(
        body.actor_type,
      ),
      actor_id: body.actor_id satisfies string as string,
      created_at: createdAt,
      productSku: { connect: { id: sku.id satisfies string as string } },
    },
  });

  return {
    id: created.id satisfies string as string,
    shopping_mall_product_sku_id:
      created.shopping_mall_product_sku_id satisfies string as string,
    adjustment_type: typia.assert<
      "addition" | "subtraction" | "reservation" | "release"
    >(created.adjustment_type),
    quantity: created.quantity,
    actor_type: typia.assert<"customer" | "seller" | "admin">(
      created.actor_type,
    ),
    actor_id: created.actor_id satisfies string as string,
    created_at: toISOStringSafe(created.created_at),
  };
}
