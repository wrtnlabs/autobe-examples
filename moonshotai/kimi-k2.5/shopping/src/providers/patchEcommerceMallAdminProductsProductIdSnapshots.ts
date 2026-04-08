import { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import { IEcommerceMallProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductSnapshot";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIEcommerceMallProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallProductSnapshot";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { EcommerceMallProductSnapshotAtSummaryTransformer } from "../transformers/EcommerceMallProductSnapshotAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchEcommerceMallAdminProductsProductIdSnapshots(props: {
  admin: AdminPayload;
  productId: string;
  body: IEcommerceMallProductSnapshot.IRequest;
}): Promise<IPageIEcommerceMallProductSnapshot.ISummary> {
  // Verify product exists
  await MyGlobal.prisma.ecommerce_mall_products.findUniqueOrThrow({
    where: { id: props.productId },
  });
  const limit = props.body.limit ?? 100;
  const page = props.body.page ?? 1;
  // Build where clause with filters
  const whereInput: Prisma.ecommerce_mall_product_snapshotsWhereInput = {
    product_id: props.productId,
    ...(props.body.createdAtFrom && {
      created_at: { gte: new Date(props.body.createdAtFrom) },
    }),
    ...(props.body.createdAtTo && {
      created_at: { lte: new Date(props.body.createdAtTo) },
    }),
  };
  // Handle cursor-based pagination
  if (props.body.cursor) {
    const cursorSnapshot =
      await MyGlobal.prisma.ecommerce_mall_product_snapshots.findUnique({
        where: { id: props.body.cursor },
        select: { created_at: true },
      });
    if (cursorSnapshot) {
      const sortDirection = props.body.sort === "created_at_ASC" ? "gt" : "lt";
      const existingDateFilter = whereInput.created_at || {};
      whereInput.created_at = Object.assign({}, existingDateFilter as object, {
        [sortDirection]: cursorSnapshot.created_at,
      });
    }
  }
  // Determine sort order
  const orderBy: Prisma.ecommerce_mall_product_snapshotsOrderByWithRelationInput =
    props.body.sort === "created_at_ASC"
      ? { created_at: "asc" }
      : { created_at: "desc" };
  // Calculate skip for offset pagination
  const skip = props.body.cursor ? undefined : (page - 1) * limit;
  // Query snapshots
  const selectResult =
    EcommerceMallProductSnapshotAtSummaryTransformer.select();
  const snapshots =
    await MyGlobal.prisma.ecommerce_mall_product_snapshots.findMany({
      where: whereInput,
      skip,
      take: limit,
      orderBy,
      ...selectResult,
    });
  // Get total count
  const total = await MyGlobal.prisma.ecommerce_mall_product_snapshots.count({
    where: {
      product_id: props.productId,
      ...(props.body.createdAtFrom && {
        created_at: { gte: new Date(props.body.createdAtFrom) },
      }),
      ...(props.body.createdAtTo && {
        created_at: { lte: new Date(props.body.createdAtTo) },
      }),
    },
  });
  // Transform results
  const transformed = await ArrayUtil.asyncMap(
    snapshots,
    EcommerceMallProductSnapshotAtSummaryTransformer.transform,
  );
  // Calculate pagination
  const pages = Math.ceil(total / limit);
  return {
    data: transformed,
    pagination: {
      current: page,
      limit,
      records: total,
      pages,
    },
  };
}
