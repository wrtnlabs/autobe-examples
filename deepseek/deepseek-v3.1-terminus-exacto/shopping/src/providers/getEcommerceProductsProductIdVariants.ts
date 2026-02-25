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

export async function getEcommerceProductsProductIdVariants(props: {
  productId: string & tags.Format<"uuid">;
}): Promise<IEcommerceProductVariant[]> {
  // First verify the product exists and is not deleted
  await MyGlobal.prisma.ecommerce_products.findUniqueOrThrow({
    where: {
      id: props.productId,
      deleted_at: null,
    },
  });
  // Retrieve all active variants for the product, sorted by creation date
  const variants = await MyGlobal.prisma.ecommerce_product_variants.findMany({
    where: {
      ecommerce_product_id: props.productId,
      deleted_at: null,
    },
    orderBy: { created_at: "asc" },
    ...EcommerceProductVariantTransformer.select(),
  });
  // Transform all variants using the transformer
  return await ArrayUtil.asyncMap(
    variants,
    EcommerceProductVariantTransformer.transform,
  );
}
