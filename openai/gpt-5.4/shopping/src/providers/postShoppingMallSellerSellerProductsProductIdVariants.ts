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
import { ShoppingMallProductVariantCollector } from "../collectors/ShoppingMallProductVariantCollector";
import { SellerPayload } from "../decorators/payload/SellerPayload";
import { ShoppingMallProductVariantTransformer } from "../transformers/ShoppingMallProductVariantTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postShoppingMallSellerSellerProductsProductIdVariants(props: {
  seller: SellerPayload;
  productId: string & tags.Format<"uuid">;
  body: IShoppingMallProductVariant.ICreate;
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
  if (seller.deleted_at !== null) {
    throw new HttpException("Seller account is deleted", 403);
  }
  if (seller.banned === true) {
    throw new HttpException("Seller account is banned", 403);
  }
  if (seller.suspended === true) {
    throw new HttpException("Seller account is suspended", 403);
  }
  if (seller.approval_status !== "approved") {
    throw new HttpException("Seller is not approved", 403);
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
  const existing =
    await MyGlobal.prisma.shopping_mall_product_variants.findFirst({
      where: {
        shopping_mall_product_id: props.productId,
        sku_code: props.body.sku_code,
      },
      select: {
        id: true,
      },
    });
  if (existing !== null) {
    throw new HttpException("SKU code is already in use for this product", 409);
  }
  try {
    const created = await MyGlobal.prisma.shopping_mall_product_variants.create(
      {
        data: await ShoppingMallProductVariantCollector.collect({
          body: props.body,
          product: {
            id: product.id,
          },
        }),
        ...ShoppingMallProductVariantTransformer.select(),
      },
    );
    return await ShoppingMallProductVariantTransformer.transform(created);
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      throw new HttpException(
        "SKU code is already in use for this product",
        409,
      );
    }
    throw error;
  }
}
