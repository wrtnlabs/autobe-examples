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
}): Promise<IPageIShoppingMallProductVariant.ISummary> {
  const product = await MyGlobal.prisma.shopping_mall_products.findUnique({
    where: { id: props.productId },
    select: { seller_id: true },
  });
  if (!product || product.seller_id !== props.seller.id) {
    throw new HttpException("Forbidden", 403);
  }
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  const where: Prisma.shopping_mall_product_variantsWhereInput = {
    shopping_mall_product_id: props.productId,
    ...(props.body.skuCode
      ? { sku_code: { contains: props.body.skuCode } }
      : {}),
    ...(props.body.priceOverrideMin !== undefined
      ? { price_override: { gte: props.body.priceOverrideMin } }
      : {}),
    ...(props.body.priceOverrideMax !== undefined
      ? { price_override: { lte: props.body.priceOverrideMax } }
      : {}),
    ...(props.body.stockQuantityMin !== undefined
      ? { stock_quantity: { gte: props.body.stockQuantityMin } }
      : {}),
    ...(props.body.stockQuantityMax !== undefined
      ? { stock_quantity: { lte: props.body.stockQuantityMax } }
      : {}),
  };
  const variants =
    await MyGlobal.prisma.shopping_mall_product_variants.findMany({
      where,
      skip,
      take: limit,
      orderBy: { created_at: "desc" },
      select: {
        id: true,
        sku_code: true,
        price_override: true,
        stock_quantity: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
      },
    });
  const total = await MyGlobal.prisma.shopping_mall_product_variants.count({
    where,
  });
  const transformedData: IShoppingMallProductVariant.ISummary[] = variants.map(
    (v) => ({
      id: v.id,
      skuCode: v.sku_code,
      priceOverride: v.price_override === null ? null : v.price_override,
      stockQuantity: v.stock_quantity,
      createdAt: v.created_at.toISOString() as string &
        tags.Format<"date-time">,
      updatedAt: v.updated_at.toISOString() as string &
        tags.Format<"date-time">,
      deletedAt:
        v.deleted_at === null
          ? null
          : (v.deleted_at.toISOString() as string & tags.Format<"date-time">),
    }),
  );
  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
    data: transformedData,
  };
}
