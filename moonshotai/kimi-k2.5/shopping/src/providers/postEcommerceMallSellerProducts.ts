import { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import { IEcommerceMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductImage";
import { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import { IEcommerceMallProductVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariantOption";
import { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { EcommerceMallProductCollector } from "../collectors/EcommerceMallProductCollector";
import { SellerPayload } from "../decorators/payload/SellerPayload";
import { EcommerceMallProductTransformer } from "../transformers/EcommerceMallProductTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postEcommerceMallSellerProducts(props: {
  seller: SellerPayload;
  body: IEcommerceMallProduct.ICreate;
}): Promise<IEcommerceMallProduct> {
  // Check seller registration status
  const seller = await MyGlobal.prisma.ecommerce_mall_sellers.findUnique({
    where: { id: props.seller.id },
    select: { approval_status: true },
  });
  if (!seller) {
    throw new HttpException("Seller not found", 404);
  }
  if (seller.approval_status !== "approved") {
    throw new HttpException(
      "Seller registration is not approved. Selling features are unavailable until registration is approved.",
      403,
    );
  }
  // Verify category exists
  await MyGlobal.prisma.ecommerce_mall_categories.findUniqueOrThrow({
    where: { id: props.body.categoryId },
  });
  // Create product using Collector and Transformer
  const created = await MyGlobal.prisma.ecommerce_mall_products.create({
    data: await EcommerceMallProductCollector.collect({
      body: props.body,
      seller: { id: props.seller.id },
    }),
    ...EcommerceMallProductTransformer.select(),
  });
  return await EcommerceMallProductTransformer.transform(created);
}
