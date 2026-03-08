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
import { AdministratorPayload } from "../decorators/payload/AdministratorPayload";
import { ShoppingMallProductSnapshotAtSummaryTransformer } from "../transformers/ShoppingMallProductSnapshotAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchShoppingMallAdministratorProductsProductIdSnapshots(props: {
  administrator: AdministratorPayload;
  productId: string & tags.Format<"uuid">;
  body: IShoppingMallProductSnapshot.IRequest;
}): Promise<IPageIShoppingMallProductSnapshot.ISummary> {
  // Verify product exists
  await MyGlobal.prisma.shopping_mall_products.findUniqueOrThrow({
    where: { id: props.productId },
  });
  // Build pagination parameters
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  // Build WHERE clause with date filters
  const whereClause: Prisma.shopping_mall_product_snapshotsWhereInput = {
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
    ...(props.body.from_date === undefined &&
      props.body.to_date !== undefined && {
        created_at: { lte: new Date(props.body.to_date) },
      }),
  };
  // Query snapshots with pagination
  const snapshots =
    await MyGlobal.prisma.shopping_mall_product_snapshots.findMany({
      where: whereClause,
      skip,
      take: limit,
      orderBy: { created_at: "desc" },
      ...ShoppingMallProductSnapshotAtSummaryTransformer.select(),
    });
  // Get total count for pagination
  const total = await MyGlobal.prisma.shopping_mall_product_snapshots.count({
    where: whereClause,
  });
  // Transform results
  const data = await ArrayUtil.asyncMap(
    snapshots,
    ShoppingMallProductSnapshotAtSummaryTransformer.transform,
  );
  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
    data,
  } satisfies IPageIShoppingMallProductSnapshot.ISummary;
}
