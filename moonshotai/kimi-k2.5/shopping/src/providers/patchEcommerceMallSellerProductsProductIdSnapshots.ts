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
import { SellerPayload } from "../decorators/payload/SellerPayload";
import { EcommerceMallProductSnapshotAtSummaryTransformer } from "../transformers/EcommerceMallProductSnapshotAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchEcommerceMallSellerProductsProductIdSnapshots(props: {
  seller: SellerPayload;
  productId: string;
  body: IEcommerceMallProductSnapshot.IRequest;
}): Promise<IPageIEcommerceMallProductSnapshot.ISummary> {
  // Verify product exists and belongs to the seller
  const product = await MyGlobal.prisma.ecommerce_mall_products.findFirst({
    where: {
      id: props.productId,
      seller_id: props.seller.id,
    },
    select: { id: true },
  });
  if (!product) {
    throw new HttpException("Product not found or access denied", 404);
  }
  // Build where clause with base condition
  const whereInput = {
    product_id: props.productId,
    ...(props.body.createdAtFrom && {
      created_at: { gte: new Date(props.body.createdAtFrom) },
    }),
    ...(props.body.createdAtTo && {
      created_at: {
        ...(props.body.createdAtFrom
          ? { gte: new Date(props.body.createdAtFrom) }
          : {}),
        lte: new Date(props.body.createdAtTo),
      },
    }),
  } satisfies Prisma.ecommerce_mall_product_snapshotsWhereInput;
  // Refine where clause if both dates are present
  const finalWhereInput =
    props.body.createdAtFrom && props.body.createdAtTo
      ? ({
          product_id: props.productId,
          created_at: {
            gte: new Date(props.body.createdAtFrom),
            lte: new Date(props.body.createdAtTo),
          },
        } satisfies Prisma.ecommerce_mall_product_snapshotsWhereInput)
      : whereInput;
  // Handle pagination
  const limit = props.body.limit ?? 20;
  const page = props.body.page ?? 1;
  const skip = (page - 1) * limit;
  // Handle sorting
  const sort = props.body.sort ?? "created_at_DESC";
  const orderByInput =
    sort === "created_at_ASC"
      ? ({
          created_at: "asc",
        } satisfies Prisma.ecommerce_mall_product_snapshotsOrderByWithRelationInput)
      : ({
          created_at: "desc",
        } satisfies Prisma.ecommerce_mall_product_snapshotsOrderByWithRelationInput);
  // Fetch snapshots
  const snapshots =
    await MyGlobal.prisma.ecommerce_mall_product_snapshots.findMany({
      where: finalWhereInput,
      skip,
      take: limit,
      orderBy: orderByInput,
      ...EcommerceMallProductSnapshotAtSummaryTransformer.select(),
    });
  // Count total
  const total = await MyGlobal.prisma.ecommerce_mall_product_snapshots.count({
    where: finalWhereInput,
  });
  const pages = Math.ceil(total / limit);
  return {
    data: await ArrayUtil.asyncMap(
      snapshots,
      EcommerceMallProductSnapshotAtSummaryTransformer.transform,
    ),
    pagination: {
      current: page,
      limit,
      records: total,
      pages,
    } satisfies IPage.IPagination,
  };
}
