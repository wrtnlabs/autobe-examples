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
import { EcommerceProductImageTransformer } from "../transformers/EcommerceProductImageTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postEcommerceProductsProductIdImages(props: {
  productId: string & tags.Format<"uuid">;
  body: IEcommerceProductImage.ICreate;
}): Promise<IEcommerceProductImage> {
  const product = await MyGlobal.prisma.ecommerce_products.findUnique({
    where: { id: props.productId },
  });
  if (!product) throw new HttpException("Product not found", 404);
  const created = await MyGlobal.prisma.ecommerce_product_images.create({
    data: await EcommerceProductImageCollector.collect({
      body: props.body,
      ecommerceProducts: product,
    }),
    ...EcommerceProductImageTransformer.select(),
  });
  return await EcommerceProductImageTransformer.transform(created);
}
