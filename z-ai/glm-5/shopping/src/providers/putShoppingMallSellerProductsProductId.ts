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
  productId: string;
  body: IShoppingMallProduct.IUpdate;
}): Promise<IShoppingMallProduct> {
  // 1. Validate seller is not suspended (other validations done by decorator)
  const seller = await MyGlobal.prisma.shopping_mall_sellers.findUniqueOrThrow({
    where: { id: props.seller.id },
    select: { suspended: true },
  });
  if (seller.suspended) {
    throw new HttpException("Seller account is suspended", 403);
  }
  // 2. Fetch product and verify ownership
  const product = await MyGlobal.prisma.shopping_mall_products.findUnique({
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
  if (product === null || product.deleted_at !== null) {
    throw new HttpException("Product not found", 404);
  }
  if (product.shopping_mall_seller_id !== props.seller.id) {
    throw new HttpException("Access denied", 403);
  }
  // 3. Check for duplicate name if name is being changed
  if (props.body.name !== undefined && props.body.name !== product.name) {
    const existingProduct =
      await MyGlobal.prisma.shopping_mall_products.findFirst({
        where: {
          shopping_mall_seller_id: props.seller.id,
          name: props.body.name,
          deleted_at: null,
          id: { not: props.productId },
        },
      });
    if (existingProduct !== null) {
      throw new HttpException(
        "Product name already exists for this seller",
        409,
      );
    }
  }
  // 4. Verify category exists if being changed
  if (
    props.body.shopping_mall_category_id !== undefined &&
    props.body.shopping_mall_category_id !== product.shopping_mall_category_id
  ) {
    const category = await MyGlobal.prisma.shopping_mall_categories.findUnique({
      where: { id: props.body.shopping_mall_category_id },
    });
    if (category === null || category.deleted_at !== null) {
      throw new HttpException("Category not found", 400);
    }
  }
  // 5. Create snapshot of current state and update product in transaction
  await MyGlobal.prisma.$transaction(async (tx) => {
    // Fetch current images and variants for snapshot
    const currentImages = await tx.shopping_mall_product_images.findMany({
      where: { shopping_mall_product_id: product.id },
    });
    // Create snapshot
    await tx.shopping_mall_product_snapshots.create({
      data: {
        id: v4(),
        shopping_mall_product_id: product.id,
        name: product.name,
        description: product.description,
        base_price: product.base_price,
        images: JSON.stringify(
          currentImages.map((img) => ({
            url: img.image_url,
            display_order: img.display_order,
          })),
        ),
        created_at: new Date(),
      },
    });
    // Update product
    await tx.shopping_mall_products.update({
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
        updated_at: new Date(),
      },
    });
  });
  // 6. Return updated product using transformer
  const updated =
    await MyGlobal.prisma.shopping_mall_products.findUniqueOrThrow({
      where: { id: props.productId },
      ...ShoppingMallProductTransformer.select(),
    });
  return await ShoppingMallProductTransformer.transform(updated);
}
