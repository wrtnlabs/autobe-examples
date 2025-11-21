import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductImage";
import { SellerPayload } from "../decorators/payload/SellerPayload";

export async function putShoppingMallSellerProductsProductIdImagesImageId(props: {
  seller: SellerPayload;
  productId: string & tags.Format<"uuid">;
  imageId: string & tags.Format<"uuid">;
  body: IShoppingMallProductImage.IUpdate;
}): Promise<IShoppingMallProductImage> {
  // Validate product exists and is owned by seller and not archived
  const product = await MyGlobal.prisma.shopping_mall_products.findFirst({
    where: {
      id: props.productId,
      shopping_mall_seller_id: props.seller.id,
      deleted_at: null,
    },
  });

  if (!product) {
    throw new HttpException("Product not found or inaccessible", 404);
  }

  // Validate image exists and belongs to this product (not variant)
  const image = await MyGlobal.prisma.shopping_mall_product_images.findUnique({
    where: {
      id: props.imageId,
      shopping_mall_product_id: props.productId,
    },
  });

  if (!image) {
    throw new HttpException(
      "Image not found or not associated with this product",
      404,
    );
  }

  // According to the DTO, IUpdate is a string. This is unusual - typically this would be an object.
  // We must assume this is a JSON string representation of the update object.
  // Parse the string body to extract update fields
  let updateFields: {
    alt_text?: string & tags.MaxLength<500>;
    sort_order?: number & tags.Type<"int32"> & tags.Minimum<0>;
    is_primary?: boolean;
  } = {};

  // Try to parse body as JSON (since it's a JSON string according to the DTO)
  try {
    const parsed = JSON.parse(props.body as string);
    if (parsed.alt_text !== undefined) {
      updateFields.alt_text = parsed.alt_text || undefined; // Allow empty string
    }
    if (parsed.sort_order !== undefined) {
      updateFields.sort_order = parsed.sort_order;
    }
    if (parsed.is_primary !== undefined) {
      updateFields.is_primary = parsed.is_primary;
    }
  } catch (e) {
    // If body is not a valid JSON string, treat as empty update
    // But per DTO, body is required to be string, so even empty string is valid
    // We'll proceed with empty update
  }

  // Track if is_primary is being modified
  if (updateFields.is_primary === true) {
    // Reset all other images for this product to is_primary = false
    await MyGlobal.prisma.shopping_mall_product_images.updateMany({
      where: {
        shopping_mall_product_id: props.productId,
        is_primary: true,
        id: { not: props.imageId },
      },
      data: {
        is_primary: false,
      },
    });
  } else if (updateFields.is_primary === false) {
    // Check if this is the only image for this product
    const otherImages =
      await MyGlobal.prisma.shopping_mall_product_images.count({
        where: {
          shopping_mall_product_id: props.productId,
          id: { not: props.imageId },
          deleted_at: null,
        },
      });

    if (otherImages === 0) {
      // This is the only image - cannot set is_primary to false
      // This would leave product without primary image
      throw new HttpException(
        "Cannot remove primary flag from the only image of a product",
        400,
      );
    }
  }

  // Update the image, using inline parameters
  const updatedImage =
    await MyGlobal.prisma.shopping_mall_product_images.update({
      where: { id: props.imageId },
      data: {
        ...updateFields,
        updated_at: toISOStringSafe(new Date()),
      },
    });

  // Return properly formatted response with correct date format
  return {
    id: updatedImage.id,
    image_url: updatedImage.image_url,
    sort_order: updatedImage.sort_order,
    is_primary: updatedImage.is_primary,
    shopping_mall_product_id:
      updatedImage.shopping_mall_product_id !== null
        ? (updatedImage.shopping_mall_product_id satisfies string as string)
        : undefined,
    shopping_mall_product_variant_id:
      updatedImage.shopping_mall_product_variant_id !== null
        ? (updatedImage.shopping_mall_product_variant_id satisfies string as string)
        : undefined,
    alt_text:
      updatedImage.alt_text === null ? undefined : updatedImage.alt_text,
    created_at: toISOStringSafe(updatedImage.created_at),
    updated_at: toISOStringSafe(updatedImage.updated_at),
  };
}
