import { IEcommerceMallOrderItemSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItemSnapshot";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IJsonObject } from "@ORGANIZATION/PROJECT-api/lib/structures/IJsonObject";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIEcommerceMallOrderItemSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallOrderItemSnapshot";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { SellerPayload } from "../decorators/payload/SellerPayload";
import { EcommerceMallOrderItemSnapshotAtSummaryTransformer } from "../transformers/EcommerceMallOrderItemSnapshotAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchEcommerceMallSellerSnapshots(props: {
  seller: SellerPayload;
  body: IEcommerceMallOrderItemSnapshot.IRequest;
}): Promise<IPageIEcommerceMallOrderItemSnapshot.ISummary> {
  // Pagination parameters
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  // Build where condition for seller's products
  const whereInput: Prisma.ecommerce_mall_order_item_snapshotsWhereInput = {
    orderItem: {
      productVariant: {
        product: {
          seller_id: props.seller.id,
        },
      },
    },
    ...(props.body.snapshot_type && {
      snapshot_type: props.body.snapshot_type,
    }),
    ...(props.body.created_at_from && {
      created_at: {
        gte: props.body.created_at_from,
      },
    }),
    ...(props.body.created_at_to && {
      created_at: {
        lte: props.body.created_at_to,
      },
    }),
  } satisfies Prisma.ecommerce_mall_order_item_snapshotsWhereInput;
  // Fetch paginated snapshots
  const snapshots =
    await MyGlobal.prisma.ecommerce_mall_order_item_snapshots.findMany({
      where: whereInput,
      skip,
      take: limit,
      orderBy: { created_at: "desc" as const },
      ...EcommerceMallOrderItemSnapshotAtSummaryTransformer.select(),
    });
  // Get total count
  const total = await MyGlobal.prisma.ecommerce_mall_order_item_snapshots.count(
    {
      where: whereInput,
    },
  );
  // Transform results
  const data = await ArrayUtil.asyncMap(
    snapshots,
    EcommerceMallOrderItemSnapshotAtSummaryTransformer.transform,
  );
  return {
    data,
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  } satisfies IPageIEcommerceMallOrderItemSnapshot.ISummary;
}
