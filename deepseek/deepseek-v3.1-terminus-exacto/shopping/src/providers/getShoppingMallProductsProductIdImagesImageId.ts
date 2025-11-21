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

export async function getShoppingMallProductsProductIdImagesImageId(props: {
  productId: string & tags.Format<"uuid">;
  imageId: string & tags.Format<"uuid">;
}): Promise<IShoppingMallProductImage> {
  const image = await MyGlobal.prisma.shopping_mall_product_images.findUnique({
    where: { id: props.imageId },
    include: {
      product: {
        include: {
          category: true,
          seller: true,
        },
      },
    },
  });

  if (!image) {
    throw new HttpException("Product image not found", 404);
  }

  if (image.shopping_mall_product_id !== props.productId) {
    throw new HttpException(
      "Product image does not belong to the specified product",
      404,
    );
  }

  return {
    id: image.id,
    product: {
      id: image.product.id,
      name: image.product.name,
      price: image.product.price,
      status: image.product.status,
      stock_quantity: image.product.stock_quantity,
      category: {
        id: image.product.category.id,
        name: image.product.category.name,
        description: image.product.category.description ?? undefined,
        display_order: image.product.category.display_order,
        active: image.product.category.active,
        parent_id:
          image.product.category.parent_id ??
          "00000000-0000-0000-0000-000000000000",
        created_at: toISOStringSafe(image.product.category.created_at),
        updated_at: toISOStringSafe(image.product.category.updated_at),
        parent: undefined,
      },
      seller: {
        id: image.product.seller.id,
        business_name: image.product.seller.business_name,
        contact_person: image.product.seller.contact_person,
        email: image.product.seller.email,
        status: image.product.seller.status,
      },
    },
    image_url: image.image_url,
    alt_text: image.alt_text ?? undefined,
    is_primary: image.is_primary,
    display_order: image.display_order,
    created_at: toISOStringSafe(image.created_at),
    updated_at: toISOStringSafe(image.updated_at),
    deleted_at: image.deleted_at
      ? toISOStringSafe(image.deleted_at)
      : undefined,
  };
}
