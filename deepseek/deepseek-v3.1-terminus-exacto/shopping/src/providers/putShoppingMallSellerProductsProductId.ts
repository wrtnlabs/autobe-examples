import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { SellerPayload } from "../decorators/payload/SellerPayload";

export async function putShoppingMallSellerProductsProductId(props: {
  seller: SellerPayload;
  productId: string & tags.Format<"uuid">;
  body: IShoppingMallProduct.IUpdate;
}): Promise<IShoppingMallProduct> {
  // Verify product exists and belongs to the seller
  const existingProduct =
    await MyGlobal.prisma.shopping_mall_products.findUnique({
      where: { id: props.productId },
    });

  if (!existingProduct) {
    throw new HttpException("Product not found", 404);
  }

  if (existingProduct.shopping_mall_seller_id !== props.seller.id) {
    throw new HttpException("You can only update your own products", 403);
  }

  // Validate category exists if provided
  if (props.body.category) {
    const category = await MyGlobal.prisma.shopping_mall_categories.findUnique({
      where: { id: props.body.category.id },
    });

    if (!category) {
      throw new HttpException("Category not found", 400);
    }
  }

  // Prepare update data with only provided fields
  const updateData: Record<string, unknown> = {
    updated_at: toISOStringSafe(new Date()),
  };

  // Add provided fields to update
  if (props.body.name !== undefined) updateData.name = props.body.name;
  if (props.body.description !== undefined)
    updateData.description = props.body.description;
  if (props.body.sku !== undefined) updateData.sku = props.body.sku;
  if (props.body.price !== undefined) updateData.price = props.body.price;
  if (props.body.compare_price !== undefined)
    updateData.compare_price = props.body.compare_price;
  if (props.body.cost_price !== undefined)
    updateData.cost_price = props.body.cost_price;
  if (props.body.stock_quantity !== undefined)
    updateData.stock_quantity = props.body.stock_quantity;
  if (props.body.status !== undefined) updateData.status = props.body.status;
  if (props.body.weight !== undefined) updateData.weight = props.body.weight;
  if (props.body.dimensions !== undefined)
    updateData.dimensions = props.body.dimensions;
  if (props.body.category !== undefined) {
    updateData.shopping_mall_category_id = props.body.category.id;
  }

  // Perform the update with related data
  const updatedProduct = await MyGlobal.prisma.shopping_mall_products.update({
    where: { id: props.productId },
    data: updateData,
    include: {
      seller: true,
      category: true,
    },
  });

  if (!updatedProduct.category) {
    throw new HttpException("Category not found", 500);
  }

  if (!updatedProduct.seller) {
    throw new HttpException("Seller not found", 500);
  }

  const categorySummary: IShoppingMallCategory.ISummary = {
    id: updatedProduct.category.id as string & tags.Format<"uuid">,
    name: updatedProduct.category.name,
    description: updatedProduct.category.description ?? undefined,
    display_order: updatedProduct.category.display_order,
    active: updatedProduct.category.active,
    parent_id: updatedProduct.category.parent_id as string &
      tags.Format<"uuid">,
    created_at: toISOStringSafe(updatedProduct.category.created_at),
    updated_at: toISOStringSafe(updatedProduct.category.updated_at),
    parent: undefined,
  };

  const sellerSummary: IShoppingMallSeller.ISummary = {
    id: updatedProduct.seller.id as string & tags.Format<"uuid">,
    business_name: updatedProduct.seller.business_name,
    contact_person: updatedProduct.seller.contact_person,
    email: updatedProduct.seller.email as string & tags.Format<"email">,
    status: updatedProduct.seller.status,
  };

  return {
    id: updatedProduct.id as string & tags.Format<"uuid">,
    name: updatedProduct.name,
    description: updatedProduct.description,
    sku: updatedProduct.sku,
    price: updatedProduct.price,
    compare_price: updatedProduct.compare_price ?? undefined,
    cost_price: updatedProduct.cost_price ?? undefined,
    stock_quantity: updatedProduct.stock_quantity,
    status: updatedProduct.status,
    condition: updatedProduct.condition,
    weight: updatedProduct.weight ?? undefined,
    dimensions: updatedProduct.dimensions ?? undefined,
    category: categorySummary,
    seller: sellerSummary,
    created_at: toISOStringSafe(updatedProduct.created_at),
    updated_at: toISOStringSafe(updatedProduct.updated_at),
  };
}
