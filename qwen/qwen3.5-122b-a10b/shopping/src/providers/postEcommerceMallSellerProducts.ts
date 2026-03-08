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
import { EcommerceMallProductCollector } from "../collectors/EcommerceMallProductCollector";
import { SellerPayload } from "../decorators/payload/SellerPayload";
import { EcommerceMallProductTransformer } from "../transformers/EcommerceMallProductTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postEcommerceMallSellerProducts(props: {
  seller: SellerPayload;
  body: IEcommerceMallProduct.ICreate;
}): Promise<IEcommerceMallProduct> {
  // Validate base price is positive
  if (props.body.base_price <= 0) {
    throw new HttpException("Base price must be a positive value", 400);
  }
  // Validate category exists and is not soft-deleted
  await MyGlobal.prisma.ecommerce_mall_categories.findUniqueOrThrow({
    where: {
      id: props.body.category_id,
      deleted_at: null,
    },
  });
  // Validate product name uniqueness among seller's active products
  const existingProduct =
    await MyGlobal.prisma.ecommerce_mall_products.findFirst({
      where: {
        seller_id: props.seller.id,
        name: props.body.name,
        status: "active",
        deleted_at: null,
      },
    });
  if (existingProduct !== null) {
    throw new HttpException(
      "Product name already exists in your active products",
      409,
    );
  }
  // Create product using collector
  const created = await MyGlobal.prisma.ecommerce_mall_products.create({
    data: await EcommerceMallProductCollector.collect({
      body: props.body,
      seller: { id: props.seller.id },
      session: { id: props.seller.session_id },
    }),
    ...EcommerceMallProductTransformer.select(),
  });
  // Transform and return
  return await EcommerceMallProductTransformer.transform(created);
}
