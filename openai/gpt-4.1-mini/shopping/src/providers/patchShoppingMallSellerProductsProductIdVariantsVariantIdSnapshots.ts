import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIShoppingMallProductVariantSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallProductVariantSnapshot";
import { IShoppingMallProductVariantSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariantSnapshot";
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

export async function patchShoppingMallSellerProductsProductIdVariantsVariantIdSnapshots(props: {
  seller: SellerPayload;
  productId: string & tags.Format<"uuid">;
  variantId: string & tags.Format<"uuid">;
  body: IShoppingMallProductVariantSnapshot.IRequest;
}): Promise<IPageIShoppingMallProductVariantSnapshot.ISummary> {
  // Since 'seller' does not exist directly in Prisma where input for shopping_mall_product_variants,
  // check seller id through product relation path or custom logic. Assuming variant has product relation which includes seller id
  const variant =
    await MyGlobal.prisma.shopping_mall_product_variants.findFirst({
      where: {
        id: props.variantId,
        product: {
          id: props.productId,
          seller_id: props.seller.id, // assuming relation field seller_id exists instead of nested seller
        },
        deleted_at: null,
      },
      select: { id: true },
    });
  if (variant === null) throw new HttpException("Forbidden", 403);
  const search = props.body.search?.trim();
  const page = props.body.page && props.body.page >= 1 ? props.body.page : 1;
  const limit =
    props.body.limit && props.body.limit >= 1 && props.body.limit <= 100
      ? props.body.limit
      : 20;
  const sortOrder = props.body.sort === "created_at" ? "asc" : "desc";
  const skip = (page - 1) * limit;
  const where: Prisma.shopping_mall_product_variant_snapshotsWhereInput = {
    shopping_mall_product_variant_id: props.variantId,
    ...(search
      ? {
          OR: [
            { sku_code: { contains: search } },
            { option_values: { contains: search } },
          ],
        }
      : {}),
  };
  const total =
    await MyGlobal.prisma.shopping_mall_product_variant_snapshots.count({
      where,
    });
  const snapshots =
    await MyGlobal.prisma.shopping_mall_product_variant_snapshots.findMany({
      where,
      orderBy: { created_at: sortOrder },
      skip,
      take: limit,
    });
  const data = snapshots.map((s) => ({
    id: s.id,
    shoppingMallProductVariantId: s.shopping_mall_product_variant_id,
    skuCode: s.sku_code,
    optionValues: s.option_values,
    priceOverride: s.price_override === null ? null : s.price_override,
    stockQuantity: s.stock_quantity,
    createdAt: toISOStringSafe(s.created_at) as unknown as string &
      tags.Format<"date-time">,
  }));
  return {
    pagination: {
      current: page,
      limit,
      records: total,
      pages: total === 0 ? 0 : Math.ceil(total / limit),
    },
    data,
  };
}
