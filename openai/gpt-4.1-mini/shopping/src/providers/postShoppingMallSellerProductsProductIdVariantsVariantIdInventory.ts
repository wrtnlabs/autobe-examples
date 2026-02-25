import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallInventoryHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallInventoryHistory";
import { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { ShoppingMallInventoryHistoryCollector } from "../collectors/ShoppingMallInventoryHistoryCollector";
import { SellerPayload } from "../decorators/payload/SellerPayload";
import { ShoppingMallInventoryHistoryTransformer } from "../transformers/ShoppingMallInventoryHistoryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postShoppingMallSellerProductsProductIdVariantsVariantIdInventory(props: {
  seller: SellerPayload;
  productId: string & tags.Format<"uuid">;
  variantId: string & tags.Format<"uuid">;
  body: IShoppingMallInventoryHistory.ICreate;
}): Promise<IShoppingMallInventoryHistory> {
  return await MyGlobal.prisma.$transaction(async (tx) => {
    const variant = await tx.shopping_mall_product_variants.findFirst({
      where: {
        id: props.variantId,
        product: {
          id: props.productId,
          seller_id: props.seller.id,
        },
        deleted_at: null,
      },
      select: { id: true },
    });
    if (!variant) {
      throw new HttpException("Variant not found or access denied", 404);
    }
    const aggregate = await tx.shopping_mall_inventory_histories.aggregate({
      _sum: { quantity_delta: true },
      where: {
        shopping_mall_product_variant_id: props.variantId,
        deleted_at: null,
      },
    });
    const currentStock = aggregate._sum.quantity_delta ?? 0;
    const newStock = currentStock + props.body.quantityDelta;
    if (newStock < 0) {
      throw new HttpException("Insufficient stock after adjustment", 400);
    }
    const data = await ShoppingMallInventoryHistoryCollector.collect({
      body: props.body,
    });
    const created = await tx.shopping_mall_inventory_histories.create({
      data,
      include: {
        productVariant: {
          include: {
            snapshots: true,
            productReviews: true,
            productReviewSnapshots: true,
            orderItems: true,
            product: true,
            inventoryHistories: true,
          },
        },
      },
    });
    // Pass the Prisma type directly to transformer without converting dates to strings first because transformer expects Date objects
    const transformed =
      await ShoppingMallInventoryHistoryTransformer.transform(created);
    // After transform get IShoppingMallInventoryHistory object with Date fields, convert them to strings using toISOStringSafe
    function convertDateFields(obj: any): any {
      if (obj === null || typeof obj !== "object") return obj;
      const copy = { ...obj };
      if (copy.created_at instanceof Date)
        copy.created_at = toISOStringSafe(copy.created_at);
      if (copy.updated_at instanceof Date)
        copy.updated_at = toISOStringSafe(copy.updated_at);
      if (copy.deleted_at instanceof Date)
        copy.deleted_at = toISOStringSafe(copy.deleted_at);
      for (const key in copy) {
        if (Array.isArray(copy[key])) {
          copy[key] = copy[key].map(convertDateFields);
        } else if (typeof copy[key] === "object" && copy[key] !== null) {
          copy[key] = convertDateFields(copy[key]);
        }
      }
      return copy;
    }
    return convertDateFields(
      transformed,
    ) satisfies IShoppingMallInventoryHistory as IShoppingMallInventoryHistory;
  });
}
