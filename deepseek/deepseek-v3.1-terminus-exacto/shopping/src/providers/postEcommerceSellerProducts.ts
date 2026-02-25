import { IEcommerceCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCategory";
import { IEcommerceProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceProduct";
import { IEcommerceSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { EcommerceProductCollector } from "../collectors/EcommerceProductCollector";
import { SellerPayload } from "../decorators/payload/SellerPayload";
import { EcommerceProductTransformer } from "../transformers/EcommerceProductTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postEcommerceSellerProducts(props: {
  seller: SellerPayload;
  body: IEcommerceProduct.ICreate;
}): Promise<IEcommerceProduct> {
  // Verify seller account is approved
  const seller = await MyGlobal.prisma.ecommerce_sellers.findFirstOrThrow({
    where: {
      id: props.seller.id,
      account_status: { in: ["approved", "active"] },
      deleted_at: null,
    },
  });
  // Check category exists
  await MyGlobal.prisma.ecommerce_categories.findFirstOrThrow({
    where: {
      id: props.body.category_id,
      deleted_at: null,
    },
  });
  // Check name uniqueness within seller's catalog
  const existingProduct = await MyGlobal.prisma.ecommerce_products.findFirst({
    where: {
      ecommerce_seller_id: props.seller.id,
      name: props.body.name,
      deleted_at: null,
    },
  });
  if (existingProduct) {
    throw new HttpException(
      "Product name must be unique within your catalog",
      400,
    );
  }
  // Validate base price is positive
  if (props.body.base_price <= 0) {
    throw new HttpException("Base price must be positive", 400);
  }
  // Create product using collector
  const productInput = await EcommerceProductCollector.collect({
    body: props.body,
    ecommerceSellers: { id: props.seller.id },
    ecommerceSellerSessions: { id: props.seller.session_id },
  });
  const created = await MyGlobal.prisma.ecommerce_products.create({
    data: productInput,
    ...EcommerceProductTransformer.select(),
  });
  return await EcommerceProductTransformer.transform(created);
}
