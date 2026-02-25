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
import { EcommerceProductImageCollector } from "../collectors/EcommerceProductImageCollector";
import { SellerPayload } from "../decorators/payload/SellerPayload";
import { EcommerceProductImageTransformer } from "../transformers/EcommerceProductImageTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postEcommerceSellerProductsProductIdImages(props: {
  seller: SellerPayload;
  productId: string & tags.Format<"uuid">;
  body: IEcommerceProductImage.ICreate;
}): Promise<IEcommerceProductImage> {
  const product = await MyGlobal.prisma.ecommerce_products.findUniqueOrThrow({
    where: { id: props.productId },
  });
  if (product.seller_id !== props.seller.id) {
    throw new HttpException("Unauthorized: Seller does not own product", 403);
  }
  if (props.body.is_main) {
    await MyGlobal.prisma.ecommerce_product_images.updateMany({
      where: {
        ecommerce_product_id: props.productId,
        is_main: true,
      },
      data: { is_main: false },
    });
  }
  const created = await MyGlobal.prisma.ecommerce_product_images.create({
    data: await EcommerceProductImageCollector.collect({
      body: props.body,
      ecommerceProducts: { id: props.productId },
    }),
    ...EcommerceProductImageTransformer.select(),
  });
  return await EcommerceProductImageTransformer.transform(created);
}
