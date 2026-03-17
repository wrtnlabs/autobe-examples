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

export async function putShoppingMallSellerSellerProductsProductIdVariantsVariantId(props: {
  seller: SellerPayload;
  productId: string & tags.Format<"uuid">;
  variantId: string & tags.Format<"uuid">;
  body: IShoppingMallProductVariant.IUpdate;
}): Promise<IShoppingMallProductVariant> {
  const seller = await MyGlobal.prisma.shopping_mall_sellers.findUniqueOrThrow({
    where: {
      id: props.seller.id,
    },
    select: {
      id: true,
      approval_status: true,
      suspended: true,
      banned: true,
      deleted_at: true,
    },
  });
  if (seller.deleted_at !== null || seller.banned === true) {
    throw new HttpException("Forbidden", 403);
  }
  if (seller.approval_status !== "approved") {
    throw new HttpException("Forbidden", 403);
  }
  if (seller.suspended === true) {
    throw new HttpException("Forbidden", 403);
  }
  const product = await MyGlobal.prisma.shopping_mall_products.findFirstOrThrow(
    {
      where: {
        id: props.productId,
        deleted_at: null,
      },
      select: {
        id: true,
        shopping_mall_seller_id: true,
      },
    },
  );
  if (product.shopping_mall_seller_id !== props.seller.id) {
    throw new HttpException("Forbidden", 403);
  }
  await MyGlobal.prisma.shopping_mall_product_variants.findFirstOrThrow({
    where: {
      id: props.variantId,
      shopping_mall_product_id: props.productId,
      deleted_at: null,
    },
    select: {
      id: true,
    },
  });
  try {
    const result =
      await MyGlobal.prisma.shopping_mall_product_variants.updateMany({
        where: {
          id: props.variantId,
          shopping_mall_product_id: props.productId,
          deleted_at: null,
        },
        data: {
          ...(props.body.sku_code !== undefined
            ? {
                sku_code: props.body.sku_code,
              }
            : {}),
          ...(props.body.option_summary !== undefined
            ? {
                option_summary: props.body.option_summary,
              }
            : {}),
          ...(props.body.price !== undefined
            ? {
                price: props.body.price,
              }
            : {}),
          updated_at: new Date(),
        },
      });
    if (result.count === 0) {
      throw new HttpException("Not Found", 404);
    }
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      throw new HttpException(
        "SKU code is already used within this product.",
        400,
      );
    }
    throw error;
  }
  const updated =
    await MyGlobal.prisma.shopping_mall_product_variants.findFirstOrThrow({
      where: {
        id: props.variantId,
        shopping_mall_product_id: props.productId,
        deleted_at: null,
      },
      ...ShoppingMallProductVariantTransformer.select(),
    });
  return await ShoppingMallProductVariantTransformer.transform(updated);
}
