import { IEcommerceMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductImage";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { SellerPayload } from "../decorators/payload/SellerPayload";
import { EcommerceMallProductImageAtSummaryTransformer } from "../transformers/EcommerceMallProductImageAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getEcommerceMallSellerProductsProductIdImages(props: {
  seller: SellerPayload;
  productId: string;
}): Promise<Array<IEcommerceMallProductImage.ISummary>> {
  const product =
    await MyGlobal.prisma.ecommerce_mall_products.findUniqueOrThrow({
      where: { id: props.productId },
      select: { id: true, seller_id: true },
    });
  if (product.seller_id !== props.seller.id) {
    throw new HttpException("Forbidden", 403);
  }
  const images = await MyGlobal.prisma.ecommerce_mall_product_images.findMany({
    where: {
      product_id: props.productId,
      deleted_at: null,
    },
    orderBy: { sort_order: "asc" },
    ...EcommerceMallProductImageAtSummaryTransformer.select(),
  });
  return await ArrayUtil.asyncMap(
    images,
    EcommerceMallProductImageAtSummaryTransformer.transform,
  );
}
