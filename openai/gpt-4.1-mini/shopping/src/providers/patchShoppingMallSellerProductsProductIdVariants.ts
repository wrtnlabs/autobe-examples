import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallProductVariant";
import { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
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

export async function patchShoppingMallSellerProductsProductIdVariants(props: {
  seller: SellerPayload;
  productId: string & tags.Format<"uuid">;
  body: IShoppingMallProductVariant.IRequest;
}): Promise<IPageIShoppingMallProductVariant> {
  const product = await MyGlobal.prisma.shopping_mall_products.findUnique({
    where: { id: props.productId },
    select: { id: true, seller_id: true, deleted_at: true },
  });
  if (!product || product.deleted_at !== null) {
    throw new HttpException("Product not found", 404);
  }
  if (product.seller_id !== props.seller.id) {
    throw new HttpException("Forbidden", 403);
  }
  // Defining default pagination values due to missing 'page' and 'limit' in IRequest
  const page = 1;
  const limit = 100;
  const skip = (page - 1) * limit;
  // Validate variants property existence and type
  if (!Array.isArray((props.body as any).variants)) {
    throw new HttpException("Variants list must be an array", 400);
  }
  const variantsInput = (props.body as any).variants as Array<any>;
  const updatedVariants = await MyGlobal.prisma.$transaction(async (prisma) => {
    for (const variantUpdate of variantsInput) {
      const dupCount = await prisma.shopping_mall_product_variants.count({
        where: {
          shopping_mall_product_id: props.productId,
          sku_code: variantUpdate.sku_code,
          NOT: { id: variantUpdate.id },
          deleted_at: null,
        },
      });
      if (dupCount > 0) {
        throw new HttpException(
          `Duplicate sku_code '${variantUpdate.sku_code}' for product`,
          400,
        );
      }
      await prisma.shopping_mall_product_variants.update({
        where: { id: variantUpdate.id },
        data: {
          sku_code: variantUpdate.sku_code,
          price_override:
            variantUpdate.price_override === undefined
              ? null
              : variantUpdate.price_override,
          stock_quantity: variantUpdate.stock_quantity,
          updated_at: toISOStringSafe(new Date()),
        },
      });
    }
    const variants = await prisma.shopping_mall_product_variants.findMany({
      where: { shopping_mall_product_id: props.productId, deleted_at: null },
      skip,
      take: limit,
      orderBy: { created_at: "desc" },
      select: {
        id: true,
        shopping_mall_product_id: true,
        sku_code: true,
        price_override: true,
        stock_quantity: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
      },
    });
    return variants;
  });
  const totalVariants =
    await MyGlobal.prisma.shopping_mall_product_variants.count({
      where: { shopping_mall_product_id: props.productId, deleted_at: null },
    });
  const transformedVariants = updatedVariants.map((v) => ({
    id: v.id as string & tags.Format<"uuid">,
    shopping_mall_product_id: v.shopping_mall_product_id as string &
      tags.Format<"uuid">,
    sku_code: v.sku_code,
    price_override: v.price_override === null ? null : v.price_override,
    stock_quantity: v.stock_quantity,
    created_at: toISOStringSafe(v.created_at),
    updated_at: toISOStringSafe(v.updated_at),
    deleted_at: v.deleted_at === null ? null : toISOStringSafe(v.deleted_at),
  }));
  return {
    data: transformedVariants,
    pagination: {
      current: page,
      limit,
      records: totalVariants,
      pages: Math.ceil(totalVariants / limit),
    },
  };
}
