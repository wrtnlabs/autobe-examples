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
import { EcommerceProductVariantTransformer } from "../transformers/EcommerceProductVariantTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getEcommerceProductsProductIdVariantsVariantId(props: {
  productId: string & tags.Format<"uuid">;
  variantId: string & tags.Format<"uuid">;
}): Promise<IEcommerceProductVariant> {
  const record = await MyGlobal.prisma.ecommerce_product_variants.findFirst({
    where: {
      id: props.variantId,
      product_id: props.productId,
      deleted_at: null,
    },
    ...EcommerceProductVariantTransformer.select(),
  });
  if (record === null || record === undefined) {
    throw new HttpException("Variant not found", 404);
  }
  if (record.product.deleted_at !== null) {
    throw new HttpException("Product not found", 404);
  }
  return await EcommerceProductVariantTransformer.transform(record);
}
