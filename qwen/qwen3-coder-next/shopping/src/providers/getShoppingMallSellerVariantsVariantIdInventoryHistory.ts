import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIShoppingMallInventoryHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallInventoryHistory";
import { IShoppingMallInventoryHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallInventoryHistory";
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

export async function getShoppingMallSellerVariantsVariantIdInventoryHistory(props: {
  seller: SellerPayload;
  variantId: string & tags.Format<"uuid">;
}): Promise<IPageIShoppingMallInventoryHistory> {
  const page = 1;
  const limit = 20;
  const skip = (page - 1) * limit;
  // Verify seller owns the variant
  const variant =
    await MyGlobal.prisma.shopping_mall_product_variants.findFirst({
      where: {
        id: props.variantId,
        product: {
          shopping_mall_seller_id: props.seller.id,
        },
      },
    });
  if (variant === null) {
    throw new HttpException("Forbidden", 403);
  }
  const data = await MyGlobal.prisma.shopping_mall_inventory_histories.findMany(
    {
      where: {
        shopping_mall_product_variant_id: props.variantId,
      },
      skip,
      take: limit,
      orderBy: {
        created_at: "desc",
      },
    },
  );
  const total = await MyGlobal.prisma.shopping_mall_inventory_histories.count({
    where: {
      shopping_mall_product_variant_id: props.variantId,
    },
  });
  return {
    data: data.map((record) => ({
      id: record.id,
      shopping_mall_product_variant_id: record.shopping_mall_product_variant_id,
      quantity_change: record.quantity_change,
      reason: [record.reason],
      shopping_mall_order_item_id: record.shopping_mall_order_item_id,
      shopping_mall_seller_id: record.shopping_mall_seller_id,
      metadata: record.metadata,
      created_at: toISOStringSafe(record.created_at),
      updated_at: toISOStringSafe((record as any).updated_at ?? null),
      deleted_at: toISOStringSafe((record as any).deleted_at ?? null),
    })),
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
  };
}
