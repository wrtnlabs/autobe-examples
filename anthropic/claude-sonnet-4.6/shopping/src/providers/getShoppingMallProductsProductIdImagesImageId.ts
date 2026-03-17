import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductImage";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { ShoppingMallProductImageTransformer } from "../transformers/ShoppingMallProductImageTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getShoppingMallProductsProductIdImagesImageId(props: {
  productId: string & tags.Format<"uuid">;
  imageId: string & tags.Format<"uuid">;
}): Promise<IShoppingMallProductImage> {
  // Step 1: Verify product exists and is not deleted
  await MyGlobal.prisma.shopping_mall_products.findFirstOrThrow({
    where: {
      id: props.productId,
      deleted_at: null,
    },
    select: { id: true },
  });
  // Step 2: Retrieve the image scoped to the given product
  const image =
    await MyGlobal.prisma.shopping_mall_product_images.findFirstOrThrow({
      where: {
        id: props.imageId,
        shopping_mall_product_id: props.productId,
      },
      ...ShoppingMallProductImageTransformer.select(),
    });
  // Step 3: Transform and return
  return ShoppingMallProductImageTransformer.transform(image);
}
