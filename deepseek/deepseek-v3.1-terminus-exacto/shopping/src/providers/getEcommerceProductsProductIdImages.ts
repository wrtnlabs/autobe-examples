import { IEcommerceCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCategory";
import { IEcommerceProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceProduct";
import { IEcommerceProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceProductImage";
import { IEcommerceSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { EcommerceProductImageTransformer } from "../transformers/EcommerceProductImageTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getEcommerceProductsProductIdImages(props: {
  productId: string & tags.Format<"uuid">;
}): Promise<IEcommerceProductImage[]> {
  // First verify the product exists
  await MyGlobal.prisma.ecommerce_products.findUniqueOrThrow({
    where: { id: props.productId },
  });
  // Query images for this product sorted by position
  const images = await MyGlobal.prisma.ecommerce_product_images.findMany({
    where: {
      ecommerce_product_id: props.productId,
    },
    orderBy: { position: "asc" },
    ...EcommerceProductImageTransformer.select(),
  });
  // Transform each image using the transformer
  return await ArrayUtil.asyncMap(
    images,
    EcommerceProductImageTransformer.transform,
  );
}
