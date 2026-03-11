import { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import { IEcommerceMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductImage";
import { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { SellerPayload } from "../decorators/payload/SellerPayload";
import { EcommerceMallProductImageTransformer } from "../transformers/EcommerceMallProductImageTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putEcommerceMallSellerProductsProductIdImagesImageId(props: {
  seller: SellerPayload;
  productId: string & tags.Format<"uuid">;
  imageId: string & tags.Format<"uuid">;
  body: IEcommerceMallProductImage.IUpdate;
}): Promise<IEcommerceMallProductImage> {
  const before = await MyGlobal.prisma.ecommerce_mall_product_images.findFirst({
    where: {
      id: props.imageId,
      product_id: props.productId,
      deleted_at: null,
    },
  });
  if (before === null) {
    throw new HttpException("Image not found", 404);
  }
  const product =
    await MyGlobal.prisma.ecommerce_mall_products.findUniqueOrThrow({
      where: { id: props.productId },
      select: { id: true, seller_id: true },
    });
  if (product.seller_id !== props.seller.id) {
    throw new HttpException("Forbidden", 403);
  }
  const updateData: Prisma.ecommerce_mall_product_imagesUpdateInput = {};
  if (props.body.image_url !== undefined) {
    updateData.image_url = props.body.image_url;
  }
  if (props.body.display_order !== undefined) {
    if (props.body.display_order < 0) {
      throw new HttpException("display_order must be non-negative", 400);
    }
    updateData.display_order = props.body.display_order;
  }
  updateData.updated_at = new Date();
  const updated = await MyGlobal.prisma.ecommerce_mall_product_images.update({
    where: { id: props.imageId },
    data: updateData,
    ...EcommerceMallProductImageTransformer.select(),
  });
  const snapshotAudit =
    await MyGlobal.prisma.ecommerce_mall_snapshot_audits.create({
      data: {
        id: v4(),
        record_type: "ProductImage",
        record_id: props.imageId,
        changed_by: props.seller.id,
        changes: JSON.stringify({
          image_url: before.image_url,
          display_order: before.display_order,
        }),
        old_values: JSON.stringify({
          image_url: before.image_url,
          display_order: before.display_order,
        }),
        new_values: JSON.stringify({
          image_url: updated.image_url,
          display_order: updated.display_order,
        }),
        changed_at: toISOStringSafe(updated.updated_at),
        created_at: new Date(),
        updated_at: new Date(),
      },
    });
  return await EcommerceMallProductImageTransformer.transform(updated);
}
