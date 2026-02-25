import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import { IShoppingMallProductCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductCategory";
import { IShoppingMallProductSubcategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductSubcategory";
import { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { SellerPayload } from "../decorators/payload/SellerPayload";
import { ShoppingMallProductTransformer } from "../transformers/ShoppingMallProductTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putShoppingMallSellerProductsProductId(props: {
  seller: SellerPayload;
  productId: string & tags.Format<"uuid">;
  body: IShoppingMallProduct.IUpdate;
}): Promise<IShoppingMallProduct> {
  const product =
    await MyGlobal.prisma.shopping_mall_products.findUniqueOrThrow({
      where: { id: props.productId },
      select: {
        id: true,
        seller_id: true,
        product_subcategory_id: true,
        name: true,
        description: true,
        base_price: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
      },
    });
  if (product.seller_id !== props.seller.id) {
    throw new HttpException("Forbidden", 403);
  }
  const variants =
    await MyGlobal.prisma.shopping_mall_product_variants.findMany({
      where: { product: { id: props.productId } },
      select: {
        id: true,
        sku_code: true,
        price_override: true,
        stock_quantity: true,
        created_at: true,
        updated_at: true,
      },
    });
  const variantIds = variants.map((v) => v.id);
  const pendingOrderVariantCount =
    await MyGlobal.prisma.shopping_mall_order_items.count({
      where: {
        shopping_mall_product_variant_id: { in: variantIds },
        status: { in: ["paid", "shipped"] },
      },
    });
  if (pendingOrderVariantCount > 0) {
    throw new HttpException("Product has pending orders or shipments", 403);
  }
  const pendingCancelRefundCount =
    await MyGlobal.prisma.shopping_mall_cancellation_requests.count({
      where: {
        orderItem: {
          shopping_mall_product_variant_id: { in: variantIds },
        },
      },
    });
  if (pendingCancelRefundCount > 0) {
    throw new HttpException(
      "Product has pending cancellation or refund requests",
      403,
    );
  }
  const now = toISOStringSafe(new Date());
  await MyGlobal.prisma.$transaction(async (tx) => {
    await tx.shopping_mall_product_snapshots.create({
      data: {
        id: v4() as string & tags.Format<"uuid">,
        product: { connect: { id: product.id } },
        category_id: product.product_subcategory_id,
        name: product.name,
        description: product.description,
        base_price: product.base_price,
        created_at: toISOStringSafe(product.created_at),
        updated_at: toISOStringSafe(product.updated_at),
        deleted_at: product.deleted_at
          ? toISOStringSafe(product.deleted_at)
          : null,
      },
    });
    for (const variant of variants) {
      await tx.shopping_mall_product_variant_snapshots.create({
        data: {
          id: v4() as string & tags.Format<"uuid">,
          product: { connect: { id: variant.id } },
          sku_code: variant.sku_code,
          price_override: variant.price_override ?? null,
          stock_quantity: variant.stock_quantity,
          created_at: toISOStringSafe(variant.created_at),
          updated_at: toISOStringSafe(variant.updated_at),
        },
      });
    }
    const updateData: {
      name?: string;
      description?: string;
      base_price?: number;
      product_subcategory_id?: string & tags.Format<"uuid">;
      updated_at: string & tags.Format<"date-time">;
    } = { updated_at: now };
    if (props.body.name !== undefined) updateData.name = props.body.name;
    if (props.body.description !== undefined)
      updateData.description = props.body.description;
    if (props.body.basePrice !== undefined)
      updateData.base_price = props.body.basePrice;
    if (props.body.productSubcategoryId !== undefined)
      updateData.product_subcategory_id = props.body.productSubcategoryId;
    await tx.shopping_mall_products.update({
      where: { id: props.productId },
      data: updateData,
    });
  });
  const updated =
    await MyGlobal.prisma.shopping_mall_products.findUniqueOrThrow({
      where: { id: props.productId },
      ...ShoppingMallProductTransformer.select(),
    });
  return await ShoppingMallProductTransformer.transform(updated);
}
