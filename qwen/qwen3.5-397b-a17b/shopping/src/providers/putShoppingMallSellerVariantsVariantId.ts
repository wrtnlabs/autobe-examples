import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
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

export async function putShoppingMallSellerVariantsVariantId(props: {
  seller: SellerPayload;
  variantId: string & tags.Format<"uuid">;
  body: IShoppingMallProductVariant.IUpdate;
}): Promise<IShoppingMallProductVariant> {
  // Step 1: Verify variant exists, is not deleted, and get product ownership info
  const variant =
    await MyGlobal.prisma.shopping_mall_product_variants.findUniqueOrThrow({
      where: {
        id: props.variantId,
        deleted_at: null,
      },
      select: {
        id: true,
        shopping_mall_product_id: true,
      },
    });
  // Step 2: Verify seller owns the parent product
  const product =
    await MyGlobal.prisma.shopping_mall_products.findUniqueOrThrow({
      where: {
        id: variant.shopping_mall_product_id,
        shopping_mall_seller_id: props.seller.id,
        deleted_at: null,
      },
      select: {
        id: true,
      },
    });
  // Step 3: If updating sku_code, check for duplicates within the same product
  if (props.body.sku_code !== undefined) {
    const existingVariant =
      await MyGlobal.prisma.shopping_mall_product_variants.findFirst({
        where: {
          shopping_mall_product_id: variant.shopping_mall_product_id,
          sku_code: props.body.sku_code,
          id: {
            not: props.variantId,
          },
          deleted_at: null,
        },
        select: {
          id: true,
        },
      });
    if (existingVariant !== null) {
      throw new HttpException("Duplicate SKU code within product", 409);
    }
  }
  // Step 4: Update variant with partial update pattern
  await MyGlobal.prisma.shopping_mall_product_variants.update({
    where: {
      id: props.variantId,
    },
    data: {
      ...(props.body.sku_code !== undefined && {
        sku_code: props.body.sku_code,
      }),
      ...(props.body.option_values !== undefined && {
        option_values: props.body.option_values,
      }),
      ...(props.body.price !== undefined && { price: props.body.price }),
      updated_at: new Date(),
    },
  });
  // Step 5: Fetch updated variant with full select
  const updated =
    await MyGlobal.prisma.shopping_mall_product_variants.findUniqueOrThrow({
      where: {
        id: props.variantId,
      },
      ...ShoppingMallProductVariantTransformer.select(),
    });
  // Step 6: Transform and return
  return await ShoppingMallProductVariantTransformer.transform(updated);
}
