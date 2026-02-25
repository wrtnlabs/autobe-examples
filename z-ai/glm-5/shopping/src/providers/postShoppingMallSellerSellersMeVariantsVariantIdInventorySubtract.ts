import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallProductInventoryHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductInventoryHistory";
import { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { SellerPayload } from "../decorators/payload/SellerPayload";
import { ShoppingMallProductInventoryHistoryTransformer } from "../transformers/ShoppingMallProductInventoryHistoryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postShoppingMallSellerSellersMeVariantsVariantIdInventorySubtract(props: {
  seller: SellerPayload;
  variantId: string & tags.Format<"uuid">;
  body: IShoppingMallProductInventoryHistory.ISubtract;
}): Promise<IShoppingMallProductInventoryHistory> {
  // 1. Verify variant exists and belongs to seller
  const variant =
    await MyGlobal.prisma.shopping_mall_product_variants.findUnique({
      where: { id: props.variantId },
      select: {
        id: true,
        deleted_at: true,
        product: {
          select: { seller_id: true },
        },
      },
    });
  if (variant === null) {
    throw new HttpException("Variant not found", 404);
  }
  if (variant.deleted_at !== null) {
    throw new HttpException("Variant has been deleted", 404);
  }
  if (variant.product.seller_id !== props.seller.id) {
    throw new HttpException(
      "You do not have permission to modify this variant",
      403,
    );
  }
  // 2. Create inventory history record with negative quantity_change
  const inventoryRecord =
    await MyGlobal.prisma.shopping_mall_product_inventory_histories.create({
      data: {
        id: v4(),
        shopping_mall_product_variant_id: props.variantId,
        quantity_change: -props.body.quantity,
        reason: props.body.reason,
        created_at: new Date(),
      },
      ...ShoppingMallProductInventoryHistoryTransformer.select(),
    });
  // 3. Transform and return response
  return await ShoppingMallProductInventoryHistoryTransformer.transform(
    inventoryRecord,
  );
}
