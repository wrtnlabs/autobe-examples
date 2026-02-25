import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import { IShoppingMallInventoryHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallInventoryHistory";
import { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import { IShoppingMallProductVariantOptionValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariantOptionValue";
import { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { ShoppingMallInventoryHistoryCollector } from "../collectors/ShoppingMallInventoryHistoryCollector";
import { SellerPayload } from "../decorators/payload/SellerPayload";
import { ShoppingMallInventoryHistoryAtInvertTransformer } from "../transformers/ShoppingMallInventoryHistoryAtInvertTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postShoppingMallSellerInventoryRestockVariantId(props: {
  seller: SellerPayload;
  variantId: string;
}): Promise<IShoppingMallInventoryHistory.IInvert> {
  // Verify variant exists and belongs to seller
  const variant =
    await MyGlobal.prisma.shopping_mall_product_variants.findUniqueOrThrow({
      where: { id: props.variantId },
      select: {
        id: true,
        shopping_mall_product_id: true,
        stock_quantity: true,
        product: {
          select: {
            shopping_mall_seller_id: true,
          },
        },
      },
    });
  // Verify seller owns the product variant
  if (variant.product.shopping_mall_seller_id !== props.seller.id) {
    throw new HttpException(
      "Forbidden: Variant does not belong to seller",
      403,
    );
  }
  // TODO: This endpoint requires a request body with quantity information
  // For now, using placeholder values - the actual implementation needs the request body
  // Create inventory history record with positive quantity
  const history =
    await MyGlobal.prisma.shopping_mall_inventory_histories.create({
      data: await ShoppingMallInventoryHistoryCollector.collect({
        body: {
          variant_id: props.variantId,
          quantity_change: 1, // TODO: Replace with actual quantity from request body
          reason: "restock" as const,
        },
      }),
      ...ShoppingMallInventoryHistoryAtInvertTransformer.select(),
    });
  // Update variant stock quantity - increment by the restocked amount
  await MyGlobal.prisma.shopping_mall_variant_stocks.update({
    where: { product_variant_id: props.variantId },
    data: {
      current_quantity: { increment: 1 }, // TODO: Replace with actual quantity from request body
      updated_at: new Date(), // TODO: Convert to string & tags.Format<'date-time'>
    },
  });
  // Transform and return
  const result =
    await ShoppingMallInventoryHistoryAtInvertTransformer.transform(history);
  return result;
}
