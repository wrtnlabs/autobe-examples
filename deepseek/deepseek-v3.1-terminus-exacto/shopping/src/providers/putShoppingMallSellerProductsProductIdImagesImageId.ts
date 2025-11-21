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

export async function putShoppingMallSellerProductsProductIdImagesImageId(props: {
  seller: SellerPayload;
  productId: string & tags.Format<"uuid">;
  imageId: string & tags.Format<"uuid">;
  body: IShoppingMallProductImage.IUpdate;
}): Promise<IShoppingMallProductImage> {
  // Verify the product exists and belongs to the seller
  const product = await MyGlobal.prisma.shopping_mall_products.findFirst({
    where: {
      id: props.productId,
      shopping_mall_seller_id: props.seller.id,
      deleted_at: null,
    },
  });

  if (!product) {
    throw new HttpException("Product not found or access denied", 404);
  }

  // Find the image and verify it belongs to the product
  const existingImage =
    await MyGlobal.prisma.shopping_mall_product_images.findFirst({
      where: {
        id: props.imageId,
        shopping_mall_product_id: props.productId,
        deleted_at: null,
      },
    });

  if (!existingImage) {
    throw new HttpException("Product image not found", 404);
  }

  // Build update data with proper Prisma typing
  const updateData: {
    image_url?: string;
    alt_text?: string | null;
    is_primary?: boolean;
    display_order?: number;
    updated_at: string;
  } = {
    updated_at: toISOStringSafe(new Date()),
  };

  if (props.body.image_url !== undefined) {
    updateData.image_url = props.body.image_url;
  }

  if (props.body.alt_text !== undefined) {
    updateData.alt_text = props.body.alt_text || null;
  }

  // Handle primary image transitions and display order conflicts in transaction
  const result = await MyGlobal.prisma.$transaction(async (tx) => {
    // Handle primary image transitions
    if (props.body.is_primary !== undefined && props.body.is_primary === true) {
      // Demote current primary image if exists
      await tx.shopping_mall_product_images.updateMany({
        where: {
          shopping_mall_product_id: props.productId,
          is_primary: true,
          id: { not: props.imageId },
          deleted_at: null,
        },
        data: {
          is_primary: false,
          updated_at: toISOStringSafe(new Date()),
        },
      });
    }

    // Handle display order conflicts
    if (props.body.display_order !== undefined) {
      const conflictingImage = await tx.shopping_mall_product_images.findFirst({
        where: {
          shopping_mall_product_id: props.productId,
          display_order: props.body.display_order,
          id: { not: props.imageId },
          deleted_at: null,
        },
      });

      if (conflictingImage) {
        // Shift existing images to make room
        await tx.shopping_mall_product_images.updateMany({
          where: {
            shopping_mall_product_id: props.productId,
            display_order: { gte: props.body.display_order },
            id: { not: props.imageId },
            deleted_at: null,
          },
          data: {
            display_order: { increment: 1 },
            updated_at: toISOStringSafe(new Date()),
          },
        });
      }
      updateData.display_order = props.body.display_order;
    }

    if (props.body.is_primary !== undefined) {
      updateData.is_primary = props.body.is_primary;
    }

    // Update the image
    const updatedImage = await tx.shopping_mall_product_images.update({
      where: { id: props.imageId },
      data: updateData,
      include: {
        product: {
          include: {
            category: true,
            seller: true,
          },
        },
      },
    });

    return updatedImage;
  });

  // Convert to API response format
  return {
    id: result.id,
    product: {
      id: result.product.id,
      name: result.product.name,
      price: result.product.price,
      status: result.product.status,
      stock_quantity: result.product.stock_quantity,
      category: {
        id: result.product.category.id,
        name: result.product.category.name,
        description: result.product.category.description ?? undefined,
        display_order: result.product.category.display_order,
        active: result.product.category.active,
        parent_id:
          result.product.category.parent_id ??
          "00000000-0000-0000-0000-000000000000",
        created_at: toISOStringSafe(result.product.category.created_at),
        updated_at: toISOStringSafe(result.product.category.updated_at),
        parent: undefined,
      },
      seller: {
        id: result.product.seller.id,
        business_name: result.product.seller.business_name,
        contact_person: result.product.seller.contact_person,
        email: result.product.seller.email,
        status: result.product.seller.status,
      },
    },
    image_url: result.image_url,
    alt_text: result.alt_text ?? undefined,
    is_primary: result.is_primary,
    display_order: result.display_order,
    created_at: toISOStringSafe(result.created_at),
    updated_at: toISOStringSafe(result.updated_at),
    deleted_at: result.deleted_at
      ? toISOStringSafe(result.deleted_at)
      : undefined,
  };
}
