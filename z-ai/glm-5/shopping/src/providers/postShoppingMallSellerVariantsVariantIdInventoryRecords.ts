import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCancellationRequest";
import { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import { IShoppingMallInventoryRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallInventoryRecord";
import { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import { IShoppingMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRefundRequest";
import { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { ShoppingMallInventoryRecordCollector } from "../collectors/ShoppingMallInventoryRecordCollector";
import { SellerPayload } from "../decorators/payload/SellerPayload";
import { ShoppingMallInventoryRecordTransformer } from "../transformers/ShoppingMallInventoryRecordTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postShoppingMallSellerVariantsVariantIdInventoryRecords(props: {
  seller: SellerPayload;
  variantId: string & tags.Format<"uuid">;
  body: IShoppingMallInventoryRecord.ICreate;
}): Promise<IShoppingMallInventoryRecord> {
  // 1. Verify variant exists and check ownership
  const variant =
    await MyGlobal.prisma.shopping_mall_product_variants.findUniqueOrThrow({
      where: { id: props.variantId },
      select: {
        id: true,
        deleted_at: true,
        product: {
          select: {
            shopping_mall_seller_id: true,
          },
        },
      },
    });
  // Check variant is not soft-deleted
  if (variant.deleted_at !== null) {
    throw new HttpException("Variant not found", 404);
  }
  // Verify seller owns the product
  if (variant.product.shopping_mall_seller_id !== props.seller.id) {
    throw new HttpException("Forbidden", 403);
  }
  // 2. If negative quantity_change, validate stock availability
  if (props.body.quantity_change < 0) {
    const stockResult =
      await MyGlobal.prisma.shopping_mall_inventory_records.aggregate({
        where: { variant_id: props.variantId },
        _sum: { quantity_change: true },
      });
    const currentStock = stockResult._sum.quantity_change ?? 0;
    const newStock = currentStock + props.body.quantity_change;
    if (newStock < 0) {
      throw new HttpException(
        "Insufficient stock: this adjustment would result in negative inventory",
        400,
      );
    }
  }
  // 3. Create inventory record using collector
  const data = await ShoppingMallInventoryRecordCollector.collect({
    body: props.body,
    shoppingMallProductVariants: { id: props.variantId },
    shoppingMallSellers: { id: props.seller.id },
  });
  const record = await MyGlobal.prisma.shopping_mall_inventory_records.create({
    data,
    ...ShoppingMallInventoryRecordTransformer.select(),
  });
  return await ShoppingMallInventoryRecordTransformer.transform(record);
}
