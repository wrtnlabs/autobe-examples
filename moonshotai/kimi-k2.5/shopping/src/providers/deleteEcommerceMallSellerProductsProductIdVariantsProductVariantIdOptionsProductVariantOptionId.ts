import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { SellerPayload } from "../decorators/payload/SellerPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function deleteEcommerceMallSellerProductsProductIdVariantsProductVariantIdOptionsProductVariantOptionId(props: {
  seller: SellerPayload;
  productId: string;
  productVariantId: string;
  productVariantOptionId: string;
}): Promise<void> {
  const option =
    await MyGlobal.prisma.ecommerce_mall_product_variant_options.findFirst({
      where: {
        id: props.productVariantOptionId,
        product_variant_id: props.productVariantId,
        productVariant: {
          product_id: props.productId,
          product: {
            seller_id: props.seller.id,
          },
        },
      },
    });
  if (option === null) {
    throw new HttpException(
      "Product variant option not found or access denied",
      404,
    );
  }
  await MyGlobal.prisma.ecommerce_mall_product_variant_options.delete({
    where: { id: props.productVariantOptionId },
  });
}
