import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIShoppingMallProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallProductSnapshot";
import { IShoppingMallProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductSnapshot";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { SellerPayload } from "../decorators/payload/SellerPayload";
import { ShoppingMallProductSnapshotAtSummaryTransformer } from "../transformers/ShoppingMallProductSnapshotAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchShoppingMallSellerProductsProductIdSnapshots(props: {
  seller: SellerPayload;
  productId: string & tags.Format<"uuid">;
  body: IShoppingMallProductSnapshot.IRequest;
}): Promise<IPageIShoppingMallProductSnapshot.ISummary> {
  // Verify product exists and check ownership
  // Note: Sellers can view snapshots even for soft-deleted products they own
  const product = await MyGlobal.prisma.shopping_mall_products.findUnique({
    where: { id: props.productId },
    select: { id: true, shopping_mall_seller_id: true },
  });
  if (product === null) {
    throw new HttpException("Product not found", 404);
  }
  if (product.shopping_mall_seller_id !== props.seller.id) {
    throw new HttpException("Forbidden", 403);
  }
  // Build pagination parameters
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  // Build where clause with optional date filters
  const whereInput = {
    shopping_mall_product_id: props.productId,
    ...(props.body.from_date !== undefined &&
      props.body.to_date !== undefined && {
        created_at: {
          gte: new Date(props.body.from_date),
          lte: new Date(props.body.to_date),
        },
      }),
    ...(props.body.from_date !== undefined &&
      props.body.to_date === undefined && {
        created_at: { gte: new Date(props.body.from_date) },
      }),
    ...(props.body.to_date !== undefined &&
      props.body.from_date === undefined && {
        created_at: { lte: new Date(props.body.to_date) },
      }),
  } satisfies Prisma.shopping_mall_product_snapshotsWhereInput;
  // Query snapshots
  const snapshots =
    await MyGlobal.prisma.shopping_mall_product_snapshots.findMany({
      where: whereInput,
      skip,
      take: limit,
      orderBy: { created_at: "desc" },
      ...ShoppingMallProductSnapshotAtSummaryTransformer.select(),
    });
  // Count total records
  const total = await MyGlobal.prisma.shopping_mall_product_snapshots.count({
    where: whereInput,
  });
  // Transform and return paginated results
  return {
    data: await ArrayUtil.asyncMap(
      snapshots,
      ShoppingMallProductSnapshotAtSummaryTransformer.transform,
    ),
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
