import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductImage";
import { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { SellerPayload } from "../decorators/payload/SellerPayload";

export async function postShoppingMallSellerProductsProductIdImages(props: {
  seller: SellerPayload;
  productId: string & tags.Format<"uuid">;
  body: IShoppingMallProductImage.ICreate;
}): Promise<IShoppingMallProductImage> {
  // Verify product exists and belongs to the seller
  const product = await MyGlobal.prisma.shopping_mall_products.findFirst({
    where: {
      id: props.productId,
      seller: { id: props.seller.id },
      deleted_at: null,
    },
  });

  if (!product) {
    throw new HttpException("Product not found or access denied", 404);
  }

  // Handle primary image logic - only update if setting as primary
  if (props.body.is_primary) {
    await MyGlobal.prisma.shopping_mall_product_images.updateMany({
      where: {
        shopping_mall_product_id: props.productId,
        is_primary: true,
        deleted_at: null,
      },
      data: {
        is_primary: false,
        updated_at: toISOStringSafe(new Date()),
      },
    });
  }

  // Create the product image
  const createdImage =
    await MyGlobal.prisma.shopping_mall_product_images.create({
      data: {
        id: v4() as string & tags.Format<"uuid">,
        shopping_mall_product_id: props.productId,
        image_url: props.body.image_url,
        alt_text: props.body.alt_text ?? null,
        is_primary: props.body.is_primary,
        display_order: props.body.display_order,
        created_at: toISOStringSafe(new Date()),
        updated_at: toISOStringSafe(new Date()),
        deleted_at: null,
      },
    });

  // Fetch complete product details with relationships for the response
  const completeProduct =
    await MyGlobal.prisma.shopping_mall_products.findUnique({
      where: { id: props.productId },
      include: {
        category: {
          include: {
            parent: true,
          },
        },
        seller: true,
      },
    });

  if (!completeProduct) {
    throw new HttpException("Product data corrupted", 500);
  }

  return {
    id: createdImage.id,
    product: {
      id: completeProduct.id,
      name: completeProduct.name,
      price: completeProduct.price,
      status: completeProduct.status,
      stock_quantity: completeProduct.stock_quantity,
      category: {
        id: completeProduct.category.id,
        name: completeProduct.category.name,
        description: completeProduct.category.description ?? undefined,
        display_order: completeProduct.category.display_order,
        active: completeProduct.category.active,
        parent_id:
          completeProduct.category.parent_id !== null
            ? (completeProduct.category.parent_id satisfies string as string &
                tags.Format<"uuid">)
            : (v4() satisfies string as string & tags.Format<"uuid">),
        created_at: toISOStringSafe(completeProduct.category.created_at),
        updated_at: toISOStringSafe(completeProduct.category.updated_at),
        parent: completeProduct.category.parent
          ? {
              id: completeProduct.category.parent.id,
              name: completeProduct.category.parent.name,
              description:
                completeProduct.category.parent.description ?? undefined,
              display_order: completeProduct.category.parent.display_order,
              active: completeProduct.category.parent.active,
              parent_id:
                completeProduct.category.parent.parent_id !== null
                  ? (completeProduct.category.parent
                      .parent_id satisfies string as string &
                      tags.Format<"uuid">)
                  : (v4() satisfies string as string & tags.Format<"uuid">),
              created_at: toISOStringSafe(
                completeProduct.category.parent.created_at,
              ),
              updated_at: toISOStringSafe(
                completeProduct.category.parent.updated_at,
              ),
              parent: undefined,
            }
          : undefined,
      },
      seller: {
        id: completeProduct.seller.id,
        business_name: completeProduct.seller.business_name,
        contact_person: completeProduct.seller.contact_person,
        email: completeProduct.seller.email,
        status: completeProduct.seller.status,
      },
    },
    image_url: createdImage.image_url,
    alt_text: createdImage.alt_text ?? undefined,
    is_primary: createdImage.is_primary,
    display_order: createdImage.display_order,
    created_at: toISOStringSafe(createdImage.created_at),
    updated_at: toISOStringSafe(createdImage.updated_at),
    deleted_at: createdImage.deleted_at
      ? toISOStringSafe(createdImage.deleted_at)
      : undefined,
  };
}
