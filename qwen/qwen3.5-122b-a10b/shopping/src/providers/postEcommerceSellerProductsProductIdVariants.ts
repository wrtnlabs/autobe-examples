import { IEcommerceCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCategory";
import { IEcommerceProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceProduct";
import { IEcommerceProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceProductVariant";
import { IEcommerceSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { EcommerceProductVariantCollector } from "../collectors/EcommerceProductVariantCollector";
import { SellerPayload } from "../decorators/payload/SellerPayload";
import { EcommerceProductVariantTransformer } from "../transformers/EcommerceProductVariantTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postEcommerceSellerProductsProductIdVariants(props: {
  seller: {
    id: string & tags.Format<"uuid">;
    session_id: string & tags.Format<"uuid">;
    type: "seller";
  };
  productId: string & tags.Format<"uuid">;
  body: IEcommerceProductVariant.ICreate;
}): Promise<IEcommerceProductVariant> {
  const product = await MyGlobal.prisma.ecommerce_products.findFirstOrThrow({
    where: {
      id: props.productId,
      seller_id: props.seller.id,
      deleted_at: null,
    },
  });
  const existing = await MyGlobal.prisma.ecommerce_product_variants.findFirst({
    where: {
      product_id: props.productId,
      sku_code: props.body.sku_code,
      deleted_at: null,
    },
  });
  if (existing !== null) {
    throw new HttpException("SKU code already exists for this product", 409);
  }
  const record = await MyGlobal.prisma.ecommerce_product_variants.create({
    data: await EcommerceProductVariantCollector.collect({
      body: props.body,
      ecommerceProducts: product,
    }),
    ...EcommerceProductVariantTransformer.select(),
  });
  return await EcommerceProductVariantTransformer.transform(record);
}
