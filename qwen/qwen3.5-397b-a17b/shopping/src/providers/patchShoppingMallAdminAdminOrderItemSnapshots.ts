import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIShoppingMallOrderItemSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallOrderItemSnapshot";
import { IShoppingMallOrderItemSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItemSnapshot";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { ShoppingMallOrderItemSnapshotAtSummaryTransformer } from "../transformers/ShoppingMallOrderItemSnapshotAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchShoppingMallAdminAdminOrderItemSnapshots(props: {
  admin: AdminPayload;
  body: IShoppingMallOrderItemSnapshot.IRequest;
}): Promise<IPageIShoppingMallOrderItemSnapshot.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  const whereInput = {
    ...(props.body.search !== undefined && {
      OR: [
        { product_name: { contains: props.body.search } },
        { seller_shop_name: { contains: props.body.search } },
      ],
    }),
    ...(props.body.product_name !== undefined && {
      product_name: { contains: props.body.product_name },
    }),
    ...(props.body.seller_shop_name !== undefined && {
      seller_shop_name: { contains: props.body.seller_shop_name },
    }),
    ...(props.body.created_at_from !== undefined && {
      created_at: { gte: new Date(props.body.created_at_from) },
    }),
    ...(props.body.created_at_to !== undefined && {
      created_at: { lte: new Date(props.body.created_at_to) },
    }),
  } satisfies Prisma.shopping_mall_order_item_snapshotsWhereInput;
  const sortField = props.body.sort ?? "created_at";
  const direction = props.body.direction ?? "desc";
  const orderByInput = {
    [sortField]: direction,
  } satisfies Prisma.shopping_mall_order_item_snapshotsOrderByWithRelationInput;
  const records =
    await MyGlobal.prisma.shopping_mall_order_item_snapshots.findMany({
      where: whereInput,
      skip,
      take: limit,
      orderBy: orderByInput,
      ...ShoppingMallOrderItemSnapshotAtSummaryTransformer.select(),
    });
  const total = await MyGlobal.prisma.shopping_mall_order_item_snapshots.count({
    where: whereInput,
  });
  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
    data: await ArrayUtil.asyncMap(
      records,
      ShoppingMallOrderItemSnapshotAtSummaryTransformer.transform,
    ),
  } satisfies IPageIShoppingMallOrderItemSnapshot.ISummary;
}
