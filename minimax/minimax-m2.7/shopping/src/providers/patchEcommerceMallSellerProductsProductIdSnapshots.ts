import { IEcommerceMallProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductSnapshot";
import { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEcommerceMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfile";
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
  productId: string & tags.Format<"uuid">;
  body: IEcommerceMallProductSnapshot.IRequest;
}): Promise<IPageIEcommerceMallProductSnapshot.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  // Verify product exists and belongs to the requesting seller
  const product =
    await MyGlobal.prisma.ecommerce_mall_products.findUniqueOrThrow({
      where: { id: props.productId },
      select: { id: true, ecommerce_mall_seller_id: true },
    });
  // Seller can only view snapshots of their own products
  if (product.ecommerce_mall_seller_id !== props.seller.id) {
    throw new HttpException("Forbidden", 403);
  }
  // Build date filter conditions
  const dateFilter: {
    created_at?: {
      gte?: Date;
      lte?: Date;
    };
  } = {};
  if (props.body.createdFrom) {
    dateFilter.created_at = { gte: new Date(props.body.createdFrom) };
  }
  if (props.body.createdTo) {
    if (!dateFilter.created_at) dateFilter.created_at = {};
    dateFilter.created_at.lte = new Date(props.body.createdTo);
  }
  // Query snapshots with filters and pagination
  const snapshots =
    await MyGlobal.prisma.ecommerce_mall_product_snapshots.findMany({
      where: {
        ecommerce_mall_product_id: props.productId,
        ...dateFilter,
      },
      orderBy: { created_at: "desc" },
      skip,
      take: limit,
      ...EcommerceMallProductSnapshotAtSummaryTransformer.select(),
    });
  // Get total count for pagination
  const total = await MyGlobal.prisma.ecommerce_mall_product_snapshots.count({
    where: {
      ecommerce_mall_product_id: props.productId,
      ...dateFilter,
    },
  });
  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
    data: await ArrayUtil.asyncMap(
      snapshots,
      EcommerceMallProductSnapshotAtSummaryTransformer.transform,
    ),
  };
}
