import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import { IShoppingMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductImage";
import { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { IShoppingMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerProfile";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { ShoppingMallProductAtSummaryTransformer } from "../transformers/ShoppingMallProductAtSummaryTransformer";
import { ShoppingMallProductImageTransformer } from "../transformers/ShoppingMallProductImageTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchShoppingMallProductsProductIdImages(props: {
  productId: string & tags.Format<"uuid">;
  body: IShoppingMallProductImage.IUpdate;
}): Promise<IShoppingMallProductImage> {
  const product =
    await MyGlobal.prisma.shopping_mall_products.findUniqueOrThrow({
      where: { id: props.productId },
      select: {
        id: true,
        shopping_mall_seller_id: true,
        deleted_at: true,
        updated_at: true,
      },
    });
  if (product.deleted_at !== null) {
    throw new HttpException("Product is not editable", 400);
  }
  const currentImages =
    await MyGlobal.prisma.shopping_mall_product_images.findMany({
      where: {
        shopping_mall_product_id: props.productId,
        deleted_at: null,
      },
      orderBy: { display_order: "asc" },
      select: {
        id: true,
        shopping_mall_product_id: true,
        image_uri: true,
        display_order: true,
        alt_text: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        product: ShoppingMallProductAtSummaryTransformer.select(),
      },
    });
  if (currentImages.length === 0) {
    throw new HttpException("Product images not found", 404);
  }
  const updated = await MyGlobal.prisma.shopping_mall_product_images.update({
    where: {
      id: currentImages[0].id,
    },
    data: {
      ...(props.body.imageUri !== undefined && {
        image_uri: props.body.imageUri,
      }),
      ...(props.body.displayOrder !== undefined && {
        display_order: props.body.displayOrder,
      }),
      ...(props.body.altText !== undefined && { alt_text: props.body.altText }),
      updated_at: new Date(),
    },
    ...ShoppingMallProductImageTransformer.select(),
  });
  if (product.shopping_mall_seller_id === null) {
    throw new HttpException("Forbidden", 403);
  }
  return await ShoppingMallProductImageTransformer.transform(updated);
}
