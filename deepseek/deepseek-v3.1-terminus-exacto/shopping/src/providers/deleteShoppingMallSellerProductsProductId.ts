import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
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

export async function deleteShoppingMallSellerProductsProductId(props: {
  seller: SellerPayload;
  productId: string & tags.Format<"uuid">;
}): Promise<IShoppingMallProduct> {
  // Verify product exists and belongs to the seller
  const product = await MyGlobal.prisma.shopping_mall_products.findFirst({
    where: {
      id: props.productId,
      shopping_mall_seller_id: props.seller.id,
      deleted_at: null,
    },
    include: {
      category: true,
      seller: true,
    },
  });

  if (!product) {
    throw new HttpException(
      "Product not found or you don't have permission to delete it",
      404,
    );
  }

  // Perform soft deletion by setting deleted_at timestamp
  const updated = await MyGlobal.prisma.shopping_mall_products.update({
    where: { id: props.productId },
    data: {
      deleted_at: toISOStringSafe(new Date()),
      updated_at: toISOStringSafe(new Date()),
    },
    include: {
      category: true,
      seller: true,
    },
  });

  if (!updated.category || !updated.seller) {
    throw new HttpException("Related category or seller data not found", 500);
  }

  // Construct category summary
  const categorySummary: IShoppingMallCategory.ISummary = {
    id: updated.category.id,
    name: updated.category.name,
    description: updated.category.description ?? undefined,
    display_order: updated.category.display_order,
    active: updated.category.active,
    parent_id:
      updated.category.parent_id ?? (v4() as string & tags.Format<"uuid">),
    created_at: toISOStringSafe(updated.category.created_at),
    updated_at: toISOStringSafe(updated.category.updated_at),
    parent: undefined,
  };

  // Construct seller summary
  const sellerSummary: IShoppingMallSeller.ISummary = {
    id: updated.seller.id,
    business_name: updated.seller.business_name,
    contact_person: updated.seller.contact_person,
    email: updated.seller.email,
    status: updated.seller.status,
  };

  return {
    id: updated.id,
    name: updated.name,
    description: updated.description,
    sku: updated.sku,
    price: updated.price,
    compare_price: updated.compare_price ?? undefined,
    cost_price: updated.cost_price ?? undefined,
    stock_quantity: updated.stock_quantity,
    status: updated.status,
    condition: updated.condition,
    weight: updated.weight ?? undefined,
    dimensions: updated.dimensions ?? undefined,
    category: categorySummary,
    seller: sellerSummary,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
  };
}
