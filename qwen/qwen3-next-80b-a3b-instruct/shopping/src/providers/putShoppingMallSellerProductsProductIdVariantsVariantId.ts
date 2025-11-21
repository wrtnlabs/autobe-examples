import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import { SellerPayload } from "../decorators/payload/SellerPayload";

export async function putShoppingMallSellerProductsProductIdVariantsVariantId(props: {
  seller: SellerPayload;
  productId: string & tags.Format<"uuid">;
  variantId: string & tags.Format<"uuid">;
  body: IShoppingMallProductVariant.IUpdate;
}): Promise<IShoppingMallProductVariant> {
  // Verify variant exists and belongs to the specified product
  const variant =
    await MyGlobal.prisma.shopping_mall_product_variants.findFirst({
      where: {
        id: props.variantId,
        shopping_mall_product_id: props.productId,
        deleted_at: null,
      },
    });

  if (!variant) {
    throw new HttpException(
      "Variant not found or does not belong to product",
      404,
    );
  }

  // Parse the JSON string from IUpdate
  const updateData = JSON.parse(
    props.body,
  ) as Partial<IShoppingMallProductVariant>;

  // Update the variant with new values
  const updated = await MyGlobal.prisma.shopping_mall_product_variants.update({
    where: { id: props.variantId },
    data: {
      title: updateData.title ?? variant.title,
      price: updateData.price ?? variant.price,
      inventory_count: updateData.inventory_count ?? variant.inventory_count,
      updated_at: toISOStringSafe(new Date()),
    },
  });

  return {
    id: updated.id,
    title: updated.title,
    price: updated.price,
    sku: updated.sku,
    inventory_count: updated.inventory_count,
    attributes: updated.attributes,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    deleted_at: updated.deleted_at
      ? toISOStringSafe(updated.deleted_at)
      : undefined,
  };
}
