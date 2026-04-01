import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import { IShoppingMallProductOptionDefinition } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductOptionDefinition";
import { IShoppingMallProductOptionValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductOptionValue";
import { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { ShoppingMallProductVariantCollector } from "../collectors/ShoppingMallProductVariantCollector";
import { SellerPayload } from "../decorators/payload/SellerPayload";
import { ShoppingMallProductVariantTransformer } from "../transformers/ShoppingMallProductVariantTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postShoppingMallSellerProductsProductIdVariants(props: {
  seller: SellerPayload;
  productId: string & tags.Format<"uuid">;
  body: IShoppingMallProductVariant.ICreate;
}): Promise<IShoppingMallProductVariant> {
  // Validate product exists and seller owns it
  const product =
    await MyGlobal.prisma.shopping_mall_products.findUniqueOrThrow({
      where: { id: props.productId },
      select: { id: true, seller_id: true },
    });
  if (product.seller_id !== props.seller.id) {
    throw new HttpException("Forbidden", 403);
  }
  // Validate all option values belong to this product's option definitions
  const optionValues =
    await MyGlobal.prisma.shopping_mall_product_option_values.findMany({
      where: {
        id: { in: props.body.option_value_ids },
        deleted_at: null,
      },
      select: {
        id: true,
        optionDefinition: {
          select: { shopping_mall_product_id: true },
        },
      },
    });
  // Check if all option values belong to the product
  const allBelongToProduct = optionValues.every(
    (ov) => ov.optionDefinition.shopping_mall_product_id === props.productId,
  );
  if (
    !allBelongToProduct ||
    optionValues.length !== props.body.option_value_ids.length
  ) {
    throw new HttpException(
      "Invalid option values - must belong to product's option definitions",
      400,
    );
  }
  // Create variant using collector
  const created = await MyGlobal.prisma.shopping_mall_product_variants
    .create({
      data: await ShoppingMallProductVariantCollector.collect({
        body: props.body,
        shoppingMallProducts: { id: props.productId },
        shoppingMallSellers: { id: props.seller.id },
      }),
      ...ShoppingMallProductVariantTransformer.select(),
    })
    .catch((error) => {
      // Handle unique constraint violation on sku_code
      if (error.code === "P2002" && error.meta?.target?.includes("sku_code")) {
        throw new HttpException("SKU code already exists", 409);
      }
      throw error;
    });
  return await ShoppingMallProductVariantTransformer.transform(created);
}
