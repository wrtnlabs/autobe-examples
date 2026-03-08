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
  // Find product and verify ownership
  const product =
    await MyGlobal.prisma.shopping_mall_products.findUniqueOrThrow({
      where: { id: props.productId },
      select: {
        id: true,
        shopping_mall_seller_id: true,
        shopping_mall_category_id: true,
        name: true,
        description: true,
        base_price: true,
        deleted_at: true,
      },
    });
  // Check product is not deleted
  if (product.deleted_at !== null) {
    throw new HttpException("Product not found", 404);
  }
  // Verify ownership
  if (product.shopping_mall_seller_id !== props.seller.id) {
    throw new HttpException("Access denied", 403);
  }
  // Check seller is not suspended
  const seller = await MyGlobal.prisma.shopping_mall_sellers.findUniqueOrThrow({
    where: { id: props.seller.id },
    select: { suspended: true },
  });
  if (seller.suspended) {
    throw new HttpException("Seller account is suspended", 403);
  }
  // Validate category if provided
  if (props.body.shopping_mall_category_id !== undefined) {
    const category = await MyGlobal.prisma.shopping_mall_categories.findUnique({
      where: { id: props.body.shopping_mall_category_id },
      select: { id: true, deleted_at: true },
    });
    if (!category || category.deleted_at !== null) {
      throw new HttpException("Category not found", 404);
    }
  }
  // Validate name uniqueness if name is being changed
  if (props.body.name !== undefined) {
    const existingProduct =
      await MyGlobal.prisma.shopping_mall_products.findFirst({
        where: {
          shopping_mall_seller_id: props.seller.id,
          name: props.body.name,
          id: { not: props.productId },
          deleted_at: null,
        },
      });
    if (existingProduct) {
      throw new HttpException("Product name already exists", 409);
    }
  }
  // Get current images for snapshot
  const currentImages =
    await MyGlobal.prisma.shopping_mall_product_images.findMany({
      where: { shopping_mall_product_id: props.productId },
      orderBy: { display_order: "asc" },
      select: { image_url: true },
    });
  // Create snapshot BEFORE update
  await MyGlobal.prisma.shopping_mall_product_snapshots.create({
    data: {
      id: v4(),
      shopping_mall_product_id: props.productId,
      name: product.name,
      description: product.description,
      base_price: product.base_price,
      images: JSON.stringify(currentImages.map((img) => img.image_url)),
      created_at: new Date(),
    },
  });
  // Update product
  await MyGlobal.prisma.shopping_mall_products.update({
    where: { id: props.productId },
    data: {
      ...(props.body.name !== undefined && { name: props.body.name }),
      ...(props.body.description !== undefined && {
        description: props.body.description,
      }),
      ...(props.body.base_price !== undefined && {
        base_price: props.body.base_price,
      }),
      ...(props.body.shopping_mall_category_id !== undefined && {
        shopping_mall_category_id: props.body.shopping_mall_category_id,
      }),
      updated_at: new Date(),
    },
  });
  // Fetch and return updated product with transformer
  const updated =
    await MyGlobal.prisma.shopping_mall_products.findUniqueOrThrow({
      where: { id: props.productId },
      ...ShoppingMallProductTransformer.select(),
    });
  return await ShoppingMallProductTransformer.transform(updated);
}
