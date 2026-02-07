import { IEcommerceCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCategory";
import { IEcommerceProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceProduct";
import { IEcommerceProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceProductVariant";
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

export async function putEcommerceProductsProductIdVariantsVariantId(props: {
  productId: string & tags.Format<"uuid">;
  variantId: string & tags.Format<"uuid">;
  body: IEcommerceProductVariant.IUpdate;
}): Promise<IEcommerceProductVariant> {
  const variant = await MyGlobal.prisma.ecommerce_product_variants.findUnique({
    where: { id: props.variantId },
    select: { products_id: true },
  });
  if (!variant) {
    throw new HttpException("Variant not found", 404);
  }
  if (variant.products_id !== props.productId) {
    throw new HttpException(
      "Variant does not belong to specified product",
      404,
    );
  }
  const updateData: any = {};
  if (props.body.price !== undefined) {
    updateData.price = props.body.price === null ? null : props.body.price;
  }
  if (props.body.stock_quantity !== undefined) {
    updateData.stock_quantity = props.body.stock_quantity;
  }
  updateData.updated_at = toISOStringSafe(new Date());
  const updated = await MyGlobal.prisma.ecommerce_product_variants.update({
    where: { id: props.variantId },
    data: updateData,
    ...EcommerceProductVariantTransformer.select(),
  });
  return await EcommerceProductVariantTransformer.transform(updated);
}
