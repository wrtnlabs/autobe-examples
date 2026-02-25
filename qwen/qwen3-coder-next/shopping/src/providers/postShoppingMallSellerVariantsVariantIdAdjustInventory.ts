import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallInventoryHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallInventoryHistory";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { SellerPayload } from "../decorators/payload/SellerPayload";
import { ShoppingMallInventoryHistoryTransformer } from "../transformers/ShoppingMallInventoryHistoryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postShoppingMallSellerVariantsVariantIdAdjustInventory(props: {
  seller: SellerPayload;
  variantId: string & tags.Format<"uuid">;
  body: IShoppingMallInventoryHistory.ICreate;
}): Promise<IShoppingMallInventoryHistory> {
  // Find the target variant and verify seller ownership
  const variant =
    await MyGlobal.prisma.shopping_mall_product_variants.findFirstOrThrow({
      where: {
        id: props.variantId,
        product: {
          shopping_mall_seller_id: props.seller.id,
        },
      },
      select: {
        id: true,
        stock_quantity: true,
      },
    });
  // Validate quantity_change is an integer
  if (!Number.isInteger(props.body.quantity_change)) {
    throw new HttpException("Quantity change must be an integer", 400);
  }
  // Calculate new stock quantity
  const newStock = variant.stock_quantity + props.body.quantity_change;
  // Reject if new stock would be negative
  if (newStock < 0) {
    throw new HttpException(
      `Insufficient stock. Current stock: ${variant.stock_quantity}, Required adjustment: ${props.body.quantity_change}`,
      400,
    );
  }
  // Create inventory history record
  const history =
    await MyGlobal.prisma.shopping_mall_inventory_histories.create({
      data: {
        id: v4() as string & tags.Format<"uuid">,
        shopping_mall_product_variant_id: props.variantId,
        shopping_mall_seller_id: props.seller.id,
        quantity_change: props.body.quantity_change,
        reason: props.body.reason,
        created_at: new Date(),
        metadata: props.body.metadata ?? null,
      },
      ...ShoppingMallInventoryHistoryTransformer.select(),
    });
  // Update variant stock quantity
  await MyGlobal.prisma.shopping_mall_product_variants.update({
    where: { id: props.variantId },
    data: { stock_quantity: newStock },
  });
  // Return transformed inventory history
  return await ShoppingMallInventoryHistoryTransformer.transform(history);
}
