import { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import { IEcommerceMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductImage";
import { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { EcommerceMallProductTransformer } from "../transformers/EcommerceMallProductTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getEcommerceMallProductsProductId(props: {
  productId: string & tags.Format<"uuid">;
}): Promise<IEcommerceMallProduct> {
  const product =
    await MyGlobal.prisma.ecommerce_mall_products.findUniqueOrThrow({
      where: { id: props.productId, deleted_at: null },
      ...EcommerceMallProductTransformer.select(),
    });
  const seller = await MyGlobal.prisma.ecommerce_mall_sellers.findUniqueOrThrow(
    {
      where: { id: product.seller.id },
      select: { id: true, deleted_at: true },
    },
  );
  if (seller.deleted_at !== null) {
    throw new HttpException("Product not found", 404);
  }
  const approvalRequest =
    await MyGlobal.prisma.ecommerce_mall_seller_approval_requests.findFirst({
      where: {
        seller_id: product.seller.id,
        status: { in: ["pending", "rejected"] },
      },
    });
  if (approvalRequest !== null) {
    throw new HttpException("Product not found", 404);
  }
  return await EcommerceMallProductTransformer.transform(product);
}
