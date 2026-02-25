import { IEcommerceCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCategory";
import { IEcommerceProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceProduct";
import { IEcommerceProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceProductImage";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { SellerPayload } from "../decorators/payload/SellerPayload";
import { EcommerceProductImageTransformer } from "../transformers/EcommerceProductImageTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putEcommerceSellerProductsProductIdImagesImageId(props: {
  seller: SellerPayload;
  productId: string & tags.Format<"uuid">;
  imageId: string & tags.Format<"uuid">;
  body: IEcommerceProductImage.IUpdate;
}): Promise<IEcommerceProductImage> {
  // Update image properties
  await MyGlobal.prisma.ecommerce_product_images.update({
    where: { id: props.imageId },
    data: {
      image_url: props.body.image_url,
      is_main: props.body.is_main,
      position: props.body.position,
      updated_at: new Date().toISOString(),
    },
  });
  // Fetch with product relation and transform
  const updated =
    await MyGlobal.prisma.ecommerce_product_images.findUniqueOrThrow({
      where: { id: props.imageId },
      ...EcommerceProductImageTransformer.select(),
    });
  return await EcommerceProductImageTransformer.transform(updated);
}
