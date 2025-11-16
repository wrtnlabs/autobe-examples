import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductImage";
import { IPageIShoppingMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallProductImage";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { IShoppingMallProductsCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductsCategory";
import { IShoppingMallProductSku } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductSku";

export async function patchShoppingMallProductsProductIdSkusSkuIdImages(props: {
  productId: string & tags.Format<"uuid">;
  skuId: string & tags.Format<"uuid">;
  body: IShoppingMallProductImage.IRequest;
}): Promise<IPageIShoppingMallProductImage.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;

  const sortBy = props.body.sort_by ?? "position";
  const sortOrder = props.body.sort_order ?? "asc";

  // Build filters for where clause
  const filters: Record<string, any> = {
    deleted_at: null,
    shopping_mall_product_id: props.productId,
    shopping_mall_product_sku_id: props.skuId,
    ...(props.body.cdn_uri && { cdn_uri: props.body.cdn_uri }),
    ...(props.body.alt_text && { alt_text: { contains: props.body.alt_text } }),
    ...(props.body.label && { label: { contains: props.body.label } }),
    ...(props.body.position !== undefined && { position: props.body.position }),
    ...(props.body.search && {
      OR: [
        { alt_text: { contains: props.body.search } },
        { label: { contains: props.body.search } },
      ],
    }),
  };

  // Pull images and count in parallel
  const [records, total] = await Promise.all([
    MyGlobal.prisma.shopping_mall_product_images.findMany({
      where: filters,
      skip,
      take: limit,
      orderBy: { [sortBy]: sortOrder },
    }),
    MyGlobal.prisma.shopping_mall_product_images.count({
      where: filters,
    }),
  ]);

  // Map to DTO
  const data = records.map((img) => ({
    id: img.id,
    cdn_uri: img.cdn_uri,
    alt_text: img.alt_text ?? undefined,
    position: img.position,
    label: img.label ?? undefined,
    product: undefined,
    sku: undefined,
    created_at: toISOStringSafe(img.created_at),
    updated_at: toISOStringSafe(img.updated_at),
    deleted_at: img.deleted_at ? toISOStringSafe(img.deleted_at) : undefined,
  }));

  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
    data,
  };
}
