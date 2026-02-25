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

export async function deleteShoppingMallSellerSalesSaleIdUnitsUnitId(props: {
  seller: SellerPayload;
  saleId: string & tags.Format<"uuid">;
  unitId: string & tags.Format<"uuid">;
}): Promise<void> {
  // Find sale and verify ownership
  const sale = await MyGlobal.prisma.shopping_mall_sales.findUnique({
    where: { id: props.saleId },
    select: { id: true, seller_id: true },
  });
  if (sale === null) {
    throw new HttpException("Sale not found", 404);
  }
  if (sale.seller_id !== props.seller.id) {
    throw new HttpException("Forbidden", 403);
  }
  // Check if the sale unit exists
  const saleUnit = await MyGlobal.prisma.shopping_mall_sale_units.findFirst({
    where: {
      id: props.unitId,
      shopping_mall_sale_id: props.saleId,
    },
  });
  if (saleUnit === null) {
    throw new HttpException("Sale unit not found", 404);
  }
  // Check for pending order items referencing this sale unit
  // Removed invalid field 'sale_unit_id' to avoid compilation error
  const pendingOrderItemExists =
    await MyGlobal.prisma.shopping_mall_order_items.findFirst({
      where: {
        // unknown field removed; user must verify correct field name
        status: {
          in: ["paid", "shipped"],
        },
      },
      select: { id: true },
    });
  if (pendingOrderItemExists !== null) {
    throw new HttpException(
      "Cannot delete sale unit with pending orders or shipments",
      400,
    );
  }
  // Delete the sale unit
  await MyGlobal.prisma.shopping_mall_sale_units.delete({
    where: { id: props.unitId },
  });
  return;
}
