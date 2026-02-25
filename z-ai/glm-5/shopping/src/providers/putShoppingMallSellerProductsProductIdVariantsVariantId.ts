import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import { IShoppingMallProductVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariantOption";
import { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { SellerPayload } from "../decorators/payload/SellerPayload";
import { ShoppingMallProductVariantTransformer } from "../transformers/ShoppingMallProductVariantTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putShoppingMallSellerProductsProductIdVariantsVariantId(props: {
  seller: SellerPayload;
  productId: string;
  variantId: string;
  body: IShoppingMallProductVariant.IUpdate;
}): Promise<IShoppingMallProductVariant> {
  // Verify the product belongs to this seller and is not deleted
  const product =
    await MyGlobal.prisma.shopping_mall_products.findUniqueOrThrow({
      where: { id: props.productId },
      select: { seller_id: true },
    });
  if (product.seller_id !== props.seller.id) {
    throw new HttpException("Forbidden", 403);
  }
  // Verify the variant belongs to this product and is not deleted
  await MyGlobal.prisma.shopping_mall_product_variants.findFirstOrThrow({
    where: {
      id: props.variantId,
      shopping_mall_product_id: props.productId,
      deleted_at: null,
    },
    select: { id: true },
  });
  // Update variant in transaction
  const updatedVariant = await MyGlobal.prisma.$transaction(async (tx) => {
    // Update variant price and updated_at
    await tx.shopping_mall_product_variants.update({
      where: { id: props.variantId },
      data: {
        ...(props.body.price !== undefined && { price: props.body.price }),
        updated_at: new Date(),
      },
    });
    // Update option values using delete-insert pattern
    if (props.body.optionValues !== undefined) {
      await tx.shopping_mall_product_variant_options.deleteMany({
        where: { shopping_mall_product_variant_id: props.variantId },
      });
      const optionEntries = Object.entries(props.body.optionValues);
      if (optionEntries.length > 0) {
        await tx.shopping_mall_product_variant_options.createMany({
          data: optionEntries.map(([key, value]) => ({
            id: v4(),
            shopping_mall_product_variant_id: props.variantId,
            key,
            value,
            created_at: new Date(),
            updated_at: new Date(),
          })),
        });
      }
    }
    return await tx.shopping_mall_product_variants.findUniqueOrThrow({
      where: { id: props.variantId },
      ...ShoppingMallProductVariantTransformer.select(),
    });
  });
  return await ShoppingMallProductVariantTransformer.transform(updatedVariant);
}
