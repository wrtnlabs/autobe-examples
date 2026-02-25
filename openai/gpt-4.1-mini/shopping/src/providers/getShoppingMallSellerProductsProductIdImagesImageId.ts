import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductImage";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { SellerPayload } from "../decorators/payload/SellerPayload";
import { ShoppingMallProductImageTransformer } from "../transformers/ShoppingMallProductImageTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getShoppingMallSellerProductsProductIdImagesImageId(props: {
  seller: SellerPayload;
  productId: string & tags.Format<"uuid">;
  imageId: string & tags.Format<"uuid">;
}): Promise<IShoppingMallProductImage> {
  const record = await MyGlobal.prisma.shopping_mall_product_images.findUnique({
    where: { id: props.imageId },
    select: {
      ...ShoppingMallProductImageTransformer.select().select,
      shopping_mall_product_id: true,
    },
  });
  if (!record) {
    throw new HttpException("Product image not found", 404);
  }
  if (record.shopping_mall_product_id !== props.productId) {
    throw new HttpException("Product image not found", 404);
  }
  const productRecord = await MyGlobal.prisma.shopping_mall_products.findUnique(
    {
      where: { id: props.productId },
      select: {
        id: true,
        seller_id: true,
      },
    },
  );
  if (!productRecord) {
    throw new HttpException("Product not found", 404);
  }
  if (productRecord.seller_id !== props.seller.id) {
    throw new HttpException("Forbidden", 403);
  }
  // Do NOT convert Date fields to string for transform input to fix type error
  const transformedRecord = {
    ...record,
    product: {
      id: productRecord.id,
    },
  };
  return await ShoppingMallProductImageTransformer.transform(transformedRecord);
}
