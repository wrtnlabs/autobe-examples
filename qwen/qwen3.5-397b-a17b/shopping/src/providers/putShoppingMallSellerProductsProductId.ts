import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import { IShoppingMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductImage";
import { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
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
    });
  if (product.shopping_mall_seller_id !== props.seller.id) {
    throw new HttpException("Forbidden", 403);
  }
  if (product.deleted_at !== null) {
    throw new HttpException("Product has been deleted", 404);
  }
  const existingVariants =
    await MyGlobal.prisma.shopping_mall_product_variants.findMany({
      where: {
        shopping_mall_product_id: props.productId,
        deleted_at: null,
      },
    });
  const variantStocks =
    await MyGlobal.prisma.shopping_mall_inventory_records.groupBy({
      by: ["shopping_mall_product_variant_id"],
      where: {
        shopping_mall_product_variant_id: {
          in: existingVariants.map((v) => v.id),
        },
      },
      _sum: {
        quantity_delta: true,
      },
    });
  const stockMap = new Map(
    variantStocks.map((record) => [
      record.shopping_mall_product_variant_id,
      record._sum?.quantity_delta ?? 0,
    ]),
  );
  const snapshotId = v4();
  const now = new Date();
  await MyGlobal.prisma.shopping_mall_product_snapshots.create({
    data: {
      id: snapshotId,
      shopping_mall_product_id: props.productId,
      name: product.name,
      description: product.description,
      shopping_mall_category_id: product.shopping_mall_category_id,
      base_price: product.base_price,
      created_at: now,
    },
  });
  const variantSnapshotData = existingVariants.map((variant) => ({
    id: v4(),
    shopping_mall_product_snapshot_id: snapshotId,
    shopping_mall_product_variant_id: variant.id,
    sku_code: variant.sku_code,
    option_values: variant.option_values,
    price: variant.price ?? 0,
    stock_quantity: stockMap.get(variant.id) ?? 0,
    created_at: now,
  }));
  await MyGlobal.prisma.shopping_mall_product_variant_snapshots.createMany({
    data: variantSnapshotData,
  });
  await MyGlobal.prisma.shopping_mall_products.update({
    where: { id: props.productId },
    data: {
      ...(props.body.name !== undefined && { name: props.body.name }),
      ...(props.body.description !== undefined && {
        description: props.body.description,
      }),
      ...(props.body.shopping_mall_category_id !== undefined && {
        shopping_mall_category_id: props.body.shopping_mall_category_id,
      }),
      ...(props.body.base_price !== undefined && {
        base_price: props.body.base_price,
      }),
      updated_at: now,
    },
  });
  const updated =
    await MyGlobal.prisma.shopping_mall_products.findUniqueOrThrow({
      where: { id: props.productId },
      ...ShoppingMallProductTransformer.select(),
    });
  return await ShoppingMallProductTransformer.transform(updated);
}
