import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIShoppingMallProductSnapshotSku } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallProductSnapshotSku";
import { IShoppingMallProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductSnapshot";
import { IShoppingMallProductSnapshotSku } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductSnapshotSku";
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

export async function patchShoppingMallSellerProductsProductIdSnapshotsSnapshotIdSkus(props: {
  seller: SellerPayload;
  productId: string & tags.Format<"uuid">;
  snapshotId: string & tags.Format<"uuid">;
  body: IShoppingMallProductSnapshotSku.IRequest;
}): Promise<IPageIShoppingMallProductSnapshotSku.ISummary> {
  // 1. Verify product snapshot exists and belongs to the product
  const snapshot =
    await MyGlobal.prisma.shopping_mall_product_snapshots.findUniqueOrThrow({
      where: { id: props.snapshotId },
      select: {
        id: true,
        shopping_mall_product_id: true,
        name: true,
        description: true,
        base_price: true,
        images: true,
        created_at: true,
        product: {
          select: {
            id: true,
            shopping_mall_seller_id: true,
          },
        },
      },
    });
  // Verify snapshot belongs to specified product
  if (snapshot.shopping_mall_product_id !== props.productId) {
    throw new HttpException("Snapshot does not belong to this product", 404);
  }
  // Verify seller owns the product
  if (snapshot.product.shopping_mall_seller_id !== props.seller.id) {
    throw new HttpException("Forbidden", 403);
  }
  // 2. Build pagination and filters
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  // Build WHERE clause for filtered results
  const whereInput = {
    shopping_mall_product_snapshot_id: props.snapshotId,
    ...(props.body.sku_code !== undefined && {
      sku_code: { contains: props.body.sku_code, mode: "insensitive" as const },
    }),
    ...(props.body.in_stock !== undefined && {
      stock_quantity: props.body.in_stock ? { gt: 0 } : { equals: 0 },
    }),
    ...(props.body.min_price !== undefined &&
      props.body.min_price !== null && {
        price: { gte: props.body.min_price },
      }),
    ...(props.body.max_price !== undefined &&
      props.body.max_price !== null && {
        price: { lte: props.body.max_price },
      }),
  } satisfies Prisma.shopping_mall_product_snapshot_skusesWhereInput;
  // 3. Query total variant count for parent snapshot (unfiltered)
  const totalVariantCount =
    await MyGlobal.prisma.shopping_mall_product_snapshot_skuses.count({
      where: { shopping_mall_product_snapshot_id: props.snapshotId },
    });
  // 4. Query with pagination (sequential await)
  const data =
    await MyGlobal.prisma.shopping_mall_product_snapshot_skuses.findMany({
      where: whereInput,
      skip,
      take: limit,
      orderBy: { created_at: "desc" },
      select: {
        id: true,
        sku_code: true,
        option_values: true,
        price: true,
        stock_quantity: true,
        created_at: true,
      },
    });
  const total =
    await MyGlobal.prisma.shopping_mall_product_snapshot_skuses.count({
      where: whereInput,
    });
  // 5. Build parent snapshot summary
  const imagesArray = JSON.parse(snapshot.images) as string[];
  const parentSnapshot: IShoppingMallProductSnapshot.ISummary = {
    id: snapshot.id,
    name: snapshot.name,
    description: snapshot.description,
    base_price: snapshot.base_price,
    thumbnail: imagesArray.length > 0 ? imagesArray[0] : null,
    variantCount: totalVariantCount,
    created_at: snapshot.created_at.toISOString(),
  };
  // 6. Transform results
  const skus: IShoppingMallProductSnapshotSku.ISummary[] = data.map((item) => ({
    id: item.id,
    sku_code: item.sku_code,
    option_values: JSON.parse(item.option_values) as Record<string, string>,
    price: item.price,
    stock_quantity: item.stock_quantity,
    created_at: item.created_at.toISOString(),
    snapshot: parentSnapshot,
  }));
  return {
    data: skus,
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
