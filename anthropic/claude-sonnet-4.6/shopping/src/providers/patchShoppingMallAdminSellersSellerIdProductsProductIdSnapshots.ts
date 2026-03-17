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
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { ShoppingMallProductSnapshotAtSummaryTransformer } from "../transformers/ShoppingMallProductSnapshotAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchShoppingMallAdminSellersSellerIdProductsProductIdSnapshots(props: {
  admin: AdminPayload;
  sellerId: string & tags.Format<"uuid">;
  productId: string & tags.Format<"uuid">;
  body: IShoppingMallProductSnapshot.IRequest;
}): Promise<IPageIShoppingMallProductSnapshot.ISummary> {
  // Step 1: Verify product exists and belongs to the specified seller.
  // Admins may access soft-deleted products, so no deleted_at filter is applied.
  const product =
    await MyGlobal.prisma.shopping_mall_products.findUniqueOrThrow({
      where: { id: props.productId },
      select: { id: true, shopping_mall_seller_id: true },
    });
  if (product.shopping_mall_seller_id !== props.sellerId) {
    throw new HttpException(
      "Product does not belong to the specified seller",
      403,
    );
  }
  // Step 2: Build the WHERE clause for snapshot filtering.
  const createdAtFilter: Prisma.DateTimeFilter<"shopping_mall_product_snapshots"> =
    {};
  if (props.body.from !== undefined) {
    createdAtFilter.gte = new Date(props.body.from);
  }
  if (props.body.to !== undefined) {
    createdAtFilter.lte = new Date(props.body.to);
  }
  const whereInput: Prisma.shopping_mall_product_snapshotsWhereInput = {
    product_id: props.productId,
    ...(props.body.name !== undefined && {
      name: { contains: props.body.name },
    }),
    ...(Object.keys(createdAtFilter).length > 0 && {
      created_at: createdAtFilter,
    }),
  };
  // Step 3: Resolve pagination parameters.
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  // Step 4: Fetch the paginated snapshot records.
  const data = await MyGlobal.prisma.shopping_mall_product_snapshots.findMany({
    where: whereInput,
    orderBy: { created_at: "desc" },
    skip,
    take: limit,
    ...ShoppingMallProductSnapshotAtSummaryTransformer.select(),
  });
  // Step 5: Count total matching records (sequential, not parallel).
  const total = await MyGlobal.prisma.shopping_mall_product_snapshots.count({
    where: whereInput,
  });
  // Step 6: Transform and return the paginated response.
  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
    data: await ArrayUtil.asyncMap(
      data,
      ShoppingMallProductSnapshotAtSummaryTransformer.transform,
    ),
  };
}
