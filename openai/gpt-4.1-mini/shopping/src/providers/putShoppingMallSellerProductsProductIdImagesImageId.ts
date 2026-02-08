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
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putShoppingMallSellerProductsProductIdImagesImageId(props: {
  seller: SellerPayload;
  productId: string & tags.Format<"uuid">;
  imageId: string & tags.Format<"uuid">;
  body: IShoppingMallProductImage.IUpdate;
}): Promise<IShoppingMallProductImage> {
  const image = await MyGlobal.prisma.shopping_mall_product_images.findFirst({
    where: {
      id: props.imageId,
      shopping_mall_product_id: props.productId,
      deleted_at: null,
    },
  });
  if (!image) {
    throw new HttpException("Product image not found", 404);
  }
  const data: Prisma.shopping_mall_product_imagesUpdateInput = {
    updated_at: toISOStringSafe(new Date()),
  };
  if ("image_url" in props.body) {
    const imgUrl = props.body.image_url;
    data.image_url = imgUrl === null ? { set: null } : { set: imgUrl };
  }
  if ("display_order" in props.body) {
    const dispOrder = props.body.display_order;
    data.display_order =
      dispOrder === null ? { set: null } : { set: dispOrder };
  }
  const updated = await MyGlobal.prisma.shopping_mall_product_images.update({
    where: { id: props.imageId },
    data,
  });
  return {
    id: updated.id,
    shopping_mall_product_id: updated.shopping_mall_product_id,
    image_url: updated.image_url ?? null,
    display_order: updated.display_order ?? null,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    deleted_at: updated.deleted_at ? toISOStringSafe(updated.deleted_at) : null,
  };
}
