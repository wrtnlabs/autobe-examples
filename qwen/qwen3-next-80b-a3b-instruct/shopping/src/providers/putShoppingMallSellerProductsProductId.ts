import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import { SellerPayload } from "../decorators/payload/SellerPayload";

export async function putShoppingMallSellerProductsProductId(props: {
  seller: SellerPayload;
  productId: string & tags.Format<"uuid">;
  body: IShoppingMallProduct.IUpdate;
}): Promise<IShoppingMallProduct> {
  // Fetch existing product to verify ownership
  const existingProduct =
    await MyGlobal.prisma.shopping_mall_products.findUnique({
      where: { id: props.productId },
      select: {
        id: true,
        name: true,
        description: true,
        category_id: true,
        base_price: true,
        created_at: true,
        updated_at: true,
        seller_id: true,
      },
    });
  if (!existingProduct) {
    throw new HttpException("Product not found", 404);
  }
  // Verify seller owns this product
  if (existingProduct.seller_id !== props.seller.id) {
    throw new HttpException("Not authorized to update this product", 403);
  }
  // Prepare update data with strict mapping to database schema field names
  const updateData: any = {};
  if (props.body.name !== undefined) {
    updateData.name = props.body.name;
  }
  if (props.body.description !== undefined) {
    updateData.description = props.body.description;
  }
  if (props.body.categoryId !== undefined) {
    updateData.category_id = props.body.categoryId;
  }
  if (props.body.basePrice !== undefined) {
    updateData.base_price = props.body.basePrice;
  }
  // Perform the update
  const updatedProduct = await MyGlobal.prisma.shopping_mall_products.update({
    where: { id: props.productId },
    data: updateData,
    select: {
      id: true,
      name: true,
      description: true,
      category_id: true,
      base_price: true,
      created_at: true,
      updated_at: true,
    },
  });
  // Transform to expected response structure
  return {
    id: updatedProduct.id,
    name: updatedProduct.name,
    description: updatedProduct.description,
    categoryId: updatedProduct.category_id,
    basePrice: updatedProduct.base_price,
    createdAt: toISOStringSafe(updatedProduct.created_at),
    updatedAt: toISOStringSafe(updatedProduct.updated_at),
  };
}
