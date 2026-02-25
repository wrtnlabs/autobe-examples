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
import { CustomerPayload } from "../decorators/payload/CustomerPayload";
import { ShoppingMallOrderItemSnapshotAtSummaryTransformer } from "../transformers/ShoppingMallOrderItemSnapshotAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchShoppingMallCustomerOrderItemSnapshots(props: {
  customer: CustomerPayload;
  body: IShoppingMallOrderItemSnapshot.IRequest;
}): Promise<IPageIShoppingMallOrderItemSnapshot.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  const andConditions: Prisma.shopping_mall_order_item_snapshotsWhereInput[] =
    [];
  if (props.body.customer_id) {
    andConditions.push({
      orderItem: { customer_id: props.body.customer_id },
    });
  }
  if (props.body.seller_id) {
    andConditions.push({ seller_id: props.body.seller_id });
  }
  if (props.body.product_id) {
    andConditions.push({ product_id: props.body.product_id });
  }
  if (props.body.variant_id) {
    andConditions.push({ variant_id: props.body.variant_id });
  }
  if (props.body.created_at_from) {
    andConditions.push({ created_at: { gte: props.body.created_at_from } });
  }
  if (props.body.created_at_to) {
    andConditions.push({ created_at: { lte: props.body.created_at_to } });
  }
  if (props.body.search) {
    andConditions.push({
      OR: [
        { product_name: { contains: props.body.search, mode: "insensitive" } },
        { variant_sku: { contains: props.body.search, mode: "insensitive" } },
        { shop_name: { contains: props.body.search, mode: "insensitive" } },
      ],
    });
  }
  const where: Prisma.shopping_mall_order_item_snapshotsWhereInput = {
    ...(andConditions.length > 0 ? { AND: andConditions } : {}),
  };
  const data =
    await MyGlobal.prisma.shopping_mall_order_item_snapshots.findMany({
      where,
      skip,
      take: limit,
      orderBy: { created_at: "desc", id: "desc" },
      ...ShoppingMallOrderItemSnapshotAtSummaryTransformer.select(),
    });
  const total = await MyGlobal.prisma.shopping_mall_order_item_snapshots.count({
    where,
  });
  return {
    data: await ArrayUtil.asyncMap(
      data,
      ShoppingMallOrderItemSnapshotAtSummaryTransformer.transform,
    ),
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
