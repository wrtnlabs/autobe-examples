import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallProductSku } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductSku";
import { SellerPayload } from "../decorators/payload/SellerPayload";

export async function putShoppingMallSellerShoppingMallProductsProductCodeShoppingMallProductSkusSkuCode(props: {
  seller: SellerPayload;
  productCode: string;
  skuCode: string;
  body: IShoppingMallProductSku.IUpdate;
}): Promise<IShoppingMallProductSku> {
  // Find the product by productCode and seller ID to verify ownership
  const product = await MyGlobal.prisma.shopping_mall_products.findFirst({
    where: {
      code: props.productCode,
      seller: { id: props.seller.id },
      deleted_at: null,
    },
    select: {
      id: true,
    },
  });

  if (!product) {
    throw new HttpException(`Product ${props.productCode} not found`, 404);
  }

  // Find the SKU by skuCode and product id
  const existingSku =
    await MyGlobal.prisma.shopping_mall_product_skus.findFirst({
      where: {
        sku_code: props.skuCode,
        shopping_mall_product_id: product.id,
        deleted_at: null,
      },
    });

  if (!existingSku) {
    throw new HttpException(
      `SKU ${props.skuCode} not found for product ${props.productCode}`,
      404,
    );
  }

  // Prepare data to update only properties present in body
  const updateData: {
    price?: number | undefined;
    inventory?: number | undefined;
    is_active?: boolean | undefined;
    sku_code?: string | undefined;
  } = {};

  if (props.body.price !== undefined) {
    updateData.price = props.body.price;
  }
  if (props.body.inventory !== undefined) {
    updateData.inventory = props.body.inventory;
  }
  if (props.body.is_active !== undefined) {
    updateData.is_active = props.body.is_active;
  }
  if (props.body.name !== undefined) {
    updateData.sku_code = props.body.name;
  }

  // Update the SKU with new values
  const updated = await MyGlobal.prisma.shopping_mall_product_skus.update({
    where: {
      id: existingSku.id,
    },
    data: updateData,
  });

  // Return the updated SKU converted to IShoppingMallProductSku
  return {
    id: updated.id,
    shopping_mall_product_id: updated.shopping_mall_product_id,
    sku_code: updated.sku_code,
    price: updated.price,
    inventory: updated.inventory,
    is_active: updated.is_active,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    deleted_at:
      updated.deleted_at !== null ? toISOStringSafe(updated.deleted_at) : null,
  };
}
