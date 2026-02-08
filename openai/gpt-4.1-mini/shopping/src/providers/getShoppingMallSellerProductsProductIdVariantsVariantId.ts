import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
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

export async function getShoppingMallSellerProductsProductIdVariantsVariantId(props: {
  seller: SellerPayload;
  productId: string & tags.Format<"uuid">;
  variantId: string & tags.Format<"uuid">;
}): Promise<IShoppingMallProductVariant> {
  const variant =
    await MyGlobal.prisma.shopping_mall_product_variants.findFirst({
      where: {
        id: props.variantId,
        product: {
          id: props.productId,
          seller_id: props.seller.id,
          deleted_at: null,
        },
        deleted_at: null,
      },
    });
  if (!variant) {
    throw new HttpException("Variant not found", 404);
  }
  const id: string & tags.Format<"uuid"> = variant.id;
  const shopping_mall_product_id: string & tags.Format<"uuid"> =
    variant.shopping_mall_product_id;
  const sku_code: string = variant.sku_code;
  const price_override: number | null = variant.price_override ?? null;
  const stock_quantity: number = variant.stock_quantity;
  const created_at: string & tags.Format<"date-time"> = toISOStringSafe(
    variant.created_at,
  );
  const updated_at: string & tags.Format<"date-time"> = toISOStringSafe(
    variant.updated_at,
  );
  const deleted_at: (string & tags.Format<"date-time">) | null =
    variant.deleted_at ? toISOStringSafe(variant.deleted_at) : null;
  return {
    id,
    shopping_mall_product_id,
    sku_code,
    price_override,
    stock_quantity,
    created_at,
    updated_at,
    deleted_at,
  };
}
