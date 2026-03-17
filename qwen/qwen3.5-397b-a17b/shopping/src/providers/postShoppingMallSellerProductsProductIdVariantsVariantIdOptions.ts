import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import { IShoppingMallProductVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariantOption";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { ShoppingMallProductVariantOptionCollector } from "../collectors/ShoppingMallProductVariantOptionCollector";
import { SellerPayload } from "../decorators/payload/SellerPayload";
import { ShoppingMallProductVariantOptionTransformer } from "../transformers/ShoppingMallProductVariantOptionTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postShoppingMallSellerProductsProductIdVariantsVariantIdOptions(props: {
  seller: SellerPayload;
  productId: string & tags.Format<"uuid">;
  variantId: string & tags.Format<"uuid">;
  body: IShoppingMallProductVariantOption.ICreate;
}): Promise<IShoppingMallProductVariantOption> {
  // Validate variant exists and belongs to the specified product owned by this seller
  const variant =
    await MyGlobal.prisma.shopping_mall_product_variants.findUniqueOrThrow({
      where: { id: props.variantId },
      select: {
        id: true,
        shopping_mall_product_id: true,
        product: {
          select: {
            shopping_seller_id: true,
          },
        },
      },
    });
  // Verify variant belongs to the specified product
  if (variant.shopping_mall_product_id !== props.productId) {
    throw new HttpException(
      "Variant does not belong to the specified product",
      400,
    );
  }
  // Verify seller owns the product
  if (variant.product.shopping_seller_id !== props.seller.id) {
    throw new HttpException("Forbidden: You do not own this product", 403);
  }
  // Create the option using collector
  const created =
    await MyGlobal.prisma.shopping_mall_product_variant_options.create({
      data: await ShoppingMallProductVariantOptionCollector.collect({
        body: props.body,
        shoppingMallProductVariants: { id: props.variantId },
      }),
      ...ShoppingMallProductVariantOptionTransformer.select(),
    });
  // Transform and return the result
  return await ShoppingMallProductVariantOptionTransformer.transform(created);
}
